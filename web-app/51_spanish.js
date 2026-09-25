// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 51_spanish.js
//  Spanish Inbox: the Gmail scan, claims, voicemails and auto-assign.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

// ── Spanish-inbox efficiency (Gmail) ────────────────────────────────────────
function getSpanishInboxAddress_() {
  try {
    const p = PropertiesService.getScriptProperties().getProperty('SPANISH_INBOX_ADDRESS');
    if (p && p.trim()) return p.trim().toLowerCase();
  } catch (e) {}
  return String(CONFIG.SPANISH_INBOX_ADDRESS || '').trim().toLowerCase();
}
/** Set of lowercased bilingual group-member emails (resolution = a reply from one). */
function getSpanishInboxMembers_() {
  let raw = '';
  try { raw = PropertiesService.getScriptProperties().getProperty('SPANISH_INBOX_MEMBERS') || ''; } catch (e) {}
  if (!raw) raw = String(CONFIG.SPANISH_INBOX_MEMBERS || '');
  const set = {};
  raw.split(',').forEach(function (s) { const e = s.trim().toLowerCase(); if (e) set[e] = true; });
  return set;
}
/** 8x8 voicemail-notification filter (operator 2026-08-25). Both halves must
 *  be non-empty for the voicemail fold to run — a half-configured filter would
 *  either match every 8x8 mail (no subject filter) or arbitrary senders (no
 *  sender filter), and either direction pulls unrelated mail into a
 *  PHI-adjacent surface. Fail direction: blank = no voicemails, never a
 *  wider scan. */
function getSpanishVmSender_() {
  let v = '';
  try { v = PropertiesService.getScriptProperties().getProperty('SPANISH_VM_SENDER'); } catch (e) {}
  if (v == null) v = CONFIG.SPANISH_VM_SENDER;
  return String(v == null ? '' : v).trim().toLowerCase();
}
function getSpanishVmFilter_() {
  let v = '';
  try { v = PropertiesService.getScriptProperties().getProperty('SPANISH_VM_SUBJECT_FILTER'); } catch (e) {}
  if (v == null) v = CONFIG.SPANISH_VM_SUBJECT_FILTER;
  return String(v == null ? '' : v).trim();
}
/** Pure: is this first message an A_Q_Spanish voicemail notification?
 *  EXACT sender address match + case-insensitive subject substring — both
 *  required (Node-pinned). */
function spanishVmMatch_(fromHeader, subject, sender, filter) {
  if (!sender || !filter) return false;
  if (emailAddrOnly_(fromHeader) !== String(sender).trim().toLowerCase()) return false;
  return String(subject || '').toLowerCase().indexOf(String(filter).toLowerCase()) >= 0;
}
/** Pure: caller name out of an 8x8 VM subject ("New voicemail from X via
 *  A_Q_Spanish" → "X"); '' when the shape doesn't match (the caller then
 *  falls back to the sender address). Node-pinned. */
function spanishVmCaller_(subject) {
  const m = String(subject || '').match(/^New voicemail from (.+?) via /i);
  return m ? m[1].trim() : '';
}
/** SP4 (operator 2026-09-16) — PURE (Node-pinned): seconds out of an 8x8
 *  notification body's `Duration: MM:SS`, or NULL when it is not there or will
 *  not parse.
 *
 *  PARSED RIGHT-TO-LEFT, and that is the load-bearing decision. The operator's
 *  two real samples are `00:01` and `00:18` — both under a minute, so neither
 *  reveals whether 8x8 renders 90 seconds as `01:30` (MM:SS) or `00:01:30`
 *  (HH:MM:SS). Taking the LAST group as seconds, the second-to-last as minutes
 *  and a third as hours is correct under either, so the parser does not depend
 *  on a sample nobody has. Capped at three groups; a fourth means this is not
 *  a duration and we say so by returning null.
 *
 *  NULL IS NOT ZERO. The caller must SHOW a card it cannot measure — see
 *  spanishVmTooShort_. A body is a VENDOR artifact: 8x8 can restyle it in a
 *  release note nobody here reads, and the failure that costs a patient a
 *  callback is the silent one. */
function spanishVmDurationSec_(body) {
  // The trailing lookahead rejects a following DIGIT as well as a colon, and
  // both halves are load-bearing. With `(?!\s*:)` alone, `00:00:00:01` matched
  // `00:00:0` — the seconds group backtracks to ONE digit, and the next
  // character then being a digit satisfies a colon-only lookahead. That read a
  // malformed duration as 0 seconds, i.e. SUPPRESSED the card, which is the one
  // direction this feature must never fail in. Found by the pin, not by reading.
  const m = String(body || '').match(/Duration:\s*((?:\d{1,3}:){1,2}\d{1,2})(?![\d:])/i);
  if (!m) return null;
  const parts = m[1].split(':').map(function (x) { return parseInt(x, 10); });
  if (parts.some(function (n) { return !isFinite(n); })) return null;
  let sec = 0;
  for (let i = 0; i < parts.length; i++) sec = sec * 60 + parts[i];   // right-to-left by construction
  return sec;
}

/** SP4 — PURE: should this voicemail be suppressed from the pending list?
 *
 *  Extracted rather than inlined so a pin can DRIVE it, message and all: a pin
 *  that asserts only the error text of an inline `if` stays green when the `if`
 *  is deleted (g116, B14). Returns one of 'show' | 'short' | 'unparsed', which
 *  is also why the caller can count the last two separately — a suppressed card
 *  is invisible, so "three hang-ups" and "the parser is dead" must never arrive
 *  as the same number.
 *
 *  `minSec <= 0` disables the gate outright (the operator's escape hatch if the
 *  vendor format moves and they want the noise back while it is fixed). */
function spanishVmTooShort_(durationSec, minSec) {
  const min = Number(minSec);
  if (!isFinite(min) || min <= 0) return 'show';
  if (durationSec === null || durationSec === undefined) return 'unparsed';
  const d = Number(durationSec);
  if (!isFinite(d)) return 'unparsed';
  return d < min ? 'short' : 'show';
}

/** SP5 (operator 2026-09-16) — PURE: the TRANSCRIPT out of an 8x8 body, or ''
 *  when there is none.
 *
 *  WHY: the 240-char snippet for a voicemail was almost entirely vendor chrome
 *  — the heading, "Your extension NNN just received…", "Received on: …",
 *  "Duration: …" — so a rep saw a handful of transcript words at most, which is
 *  the one part that says what the call is about. Not every voicemail is
 *  transcribed, so '' is a normal answer and the caller falls back to the old
 *  whole-body snippet: this can only ADD information, never remove it. */
function spanishVmTranscript_(body) {
  const txt = String(body || '');
  const m = txt.match(/\bTranscript\b\s*:?\s*/i);
  if (!m) return '';
  return txt.slice(m.index + m[0].length).replace(/\s+/g, ' ').trim();
}

/** SP4 — the suppression threshold in SECONDS. CONFIG seed, Script Property
 *  override (the SPANISH_VM_SENDER pattern); 0 or unparseable disables the
 *  gate, which is deliberate: the operator can turn it off without a redeploy. */
function getSpanishVmMinSeconds_() {
  let v = null;
  try { v = PropertiesService.getScriptProperties().getProperty('SPANISH_VM_MIN_SECONDS'); } catch (e) {}
  if (v == null || String(v).trim() === '') v = CONFIG.SPANISH_VM_MIN_SECONDS;
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 ? n : 0;
}

/** The VM Gmail query — sender + quoted subject filter over the same window
 *  the main scan uses. */
function spanishVmQuery_(sender, filter, days) {
  return 'from:' + sender + ' subject:"' + String(filter).replace(/"/g, '') + '" newer_than:' + days + 'd';
}
/** ONE scope predicate for the by-id Spanish endpoints (ThreadBody / resolve /
 *  claim): a thread is in scope when its FIRST message is addressed to the
 *  configured inbox (To or Cc, exact address match) OR is a configured 8x8
 *  voicemail notification. Factored from the three inline checks when the
 *  voicemail fold widened the definition (operator 2026-08-25) — three sites
 *  drifting on a security check is the parallel-source class. */
function spanishThreadInScope_(firstMsg, addr) {
  if (spanishAddrListIncludes_(String(firstMsg.getTo() || '') + ',' + String(firstMsg.getCc() || ''), addr)) return true;
  return spanishVmMatch_(firstMsg.getFrom(), firstMsg.getSubject(), getSpanishVmSender_(), getSpanishVmFilter_());
}
/** Spanish Inbox access predicate — managers OR a bilingual rep listed in
 *  SPANISH_INBOX_MEMBERS (the same roster used to detect "resolved by a member";
 *  the reps who actually action the inbox). INV-31 amendment: the four Spanish
 *  endpoints gate on THIS, not isManager. Reps get the FULL feature (pending
 *  list + bodies + stats) — they're the responders. Bodies stay live-read /
 *  never stored (the PHI-adjacent posture is unchanged). */
function canSeeSpanishInbox_(emp) {
  if (!emp) return false;
  if (emp.isManager) return true;
  var members = getSpanishInboxMembers_();
  return !!members[String(emp.email || '').trim().toLowerCase()];
}
/** Stable short hash of the inbox address + member set, used to scope the stats
 *  cache key so editing SPANISH_INBOX_ADDRESS / SPANISH_INBOX_MEMBERS isn't masked
 *  by a stale (wrong-resolution) aggregate for up to the 5-min TTL. Mirrors cdrRosterHash_. */
function spanishCacheHash_(addr, members) {
  const basis = String(addr || '') + '|' + Object.keys(members || {}).sort().join(',');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, basis)
    .map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}
/** F(cycle-8): exact-address membership test for a To/Cc header list. The
 *  prior scope guards did a raw substring `indexOf(addr)`, so ANY recipient
 *  string merely CONTAINING the inbox address (xspanishcalls@…, the address
 *  inside a display name) passed. Splits on commas, extracts each bare
 *  address (the emailAddrOnly_ rules), compares exactly. Pure — Node-pinned. */
function spanishAddrListIncludes_(headerList, addr) {
  const want = String(addr || '').trim().toLowerCase();
  if (!want) return false;
  return String(headerList || '').split(',').some(function (part) {
    return emailAddrOnly_(part) === want;
  });
}
/** F(cycle-8): the Gmail scan query. `to:` matches the To header only, so a
 *  request where the group inbox was Cc'd (a rep looping the group into an
 *  existing thread) never entered stats/pending/resolved. Brace-OR covers
 *  both headers. */
function spanishSearchQuery_(addr, days) {
  return '{to:' + addr + ' cc:' + addr + '} newer_than:' + days + 'd';
}
/** Spanish-inbox resolution stats (canSeeSpanishInbox_-gated — manager OR SPANISH_INBOX_MEMBERS, INV-31 amendment; read-only). Scans the
 *  DEPLOYER's Gmail for threads addressed to the group inbox over the last
 *  `days` and computes time-to-resolution (first inbound → first reply from a
 *  bilingual group member). PHI-free: returns counts + durations + requester
 *  email + age only — never the subject/body. 5-min cached. Requires the deploy
 *  account to be a member of the group (so it receives the threads). */
function getSpanishInboxStats(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };

    const cache = CacheService.getScriptCache();
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    // Cache key is scoped by address + member set (not just `days`) so an operator
    // editing SPANISH_INBOX_ADDRESS / SPANISH_INBOX_MEMBERS isn't served a stale
    // aggregate computed under the old config for the TTL.
    const ckey = 'spanish_inbox_v3:' + d + ':' + spanishCacheHash_(addr, members);   // v2: manual resolves left the duration series (2026-09-10); v3: voicemails joined the counts (F-34, cycle 20) — INV-85, a cached v2 aggregate must not keep serving the thread-only numbers for the TTL
    const hit = cache.get(ckey);
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }

    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, SPANISH_THREAD_SCAN_MAX);
    const manual = spanishManualResolvedMap_();
    const durations = [], bizDurations = [], pending = [];
    let resolvedCount = 0, manualCount = 0;
    const nowMs = Date.now();
    threads.forEach(function (th) {
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const reqMs = req.getDate().getTime();
      const requester = emailAddrOnly_(req.getFrom());
      let resolveMs = null;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        // Resolved = a reply from a configured bilingual member; if no member
        // list is set, fall back to "first reply from someone else".
        const isResolver = haveMembers ? !!members[from] : (from && from !== requester);
        if (isResolver) { resolveMs = msgs[i].getDate().getTime(); break; }
      }
      // Manual mark-resolved (handled outside the thread) counts as resolved;
      // an in-thread reply wins when both exist. max() guards a skewed stamp.
      let wasManual = false;
      if (resolveMs == null && manual[th.getId()]) {
        resolveMs = Math.max(reqMs, manual[th.getId()].ms || reqMs);
        wasManual = true;
      }
      if (resolveMs != null) {
        resolvedCount++;
        // Operator 2026-09-10: a MANUAL mark-resolved counts as resolved but
        // NEVER as a response time — the stamp is when someone pressed the
        // button, not when the requester was answered. Counted separately so
        // the exclusion is visible (INV-187), and OUT of both series.
        if (wasManual) { manualCount++; }
        else {
        durations.push(Math.max(0, Math.round((resolveMs - reqMs) / 60000)));   // wall-clock minutes
        // Operator 2026-08-31 — BUSINESS minutes are the headline: nobody
        // replies overnight or at the weekend, so a Friday-evening request
        // answered first thing Monday was counting as ~41 hours of "response
        // time". A null (corrupt stamp pair) is DROPPED from the business
        // series rather than substituted, so the two series can legitimately
        // differ in length — which is why each has its own count.
        const bizMin = businessMinutesBetween_(reqMs, resolveMs);
        if (bizMin != null) bizDurations.push(bizMin);
        }
      } else {
        pending.push({ requester: requester, ageHours: Math.round((nowMs - reqMs) / 3600000) });
      }
    });
    // F-34: the SAME voicemail fold the list runs. `seen` is the group-address
    // thread set, so a voicemail that also reached the group address is not
    // double-counted. A voicemail resolved by a member reply gets its duration
    // like any other request; a MANUAL resolve is counted and never timed, the
    // same exclusion the loop above applies (INV-187).
    const seenStats = {};
    threads.forEach(function (th) { seenStats[th.getId()] = true; });
    const vmFold = spanishVmFold_(d, manual, members, haveMembers, seenStats);
    vmFold.rows.forEach(function (r) {
      if (r.resolveMs == null) {
        pending.push({ requester: spanishVmCaller_(r.subject) || emailAddrOnly_(r.from),
                       ageHours: Math.round((nowMs - r.reqMs) / 3600000) });
        return;
      }
      resolvedCount++;
      if (r.wasManual) { manualCount++; return; }
      durations.push(Math.max(0, Math.round((r.resolveMs - r.reqMs) / 60000)));
      const vmBizMin = businessMinutesBetween_(r.reqMs, r.resolveMs);
      if (vmBizMin != null) bizDurations.push(vmBizMin);
    });

    durations.sort(function (a, b) { return a - b; });
    bizDurations.sort(function (a, b) { return a - b; });
    const avg = durations.length ? Math.round(durations.reduce(function (s, x) { return s + x; }, 0) / durations.length) : null;
    const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
    const bizAvg = bizDurations.length ? Math.round(bizDurations.reduce(function (s, x) { return s + x; }, 0) / bizDurations.length) : null;
    const bizMedian = bizDurations.length ? bizDurations[Math.floor(bizDurations.length / 2)] : null;
    pending.sort(function (a, b) { return b.ageHours - a.ageHours; });
    const result = {
      address: addr, days: d,
      resolved: resolvedCount, pending: pending.length,
      manualCount: manualCount,   // marked resolved by hand — counted, never timed (operator 2026-09-10)
      avgMinutes: avg, medianMinutes: median,
      // Business-hours figures (weekends + US holidays excluded, counted only
      // within the business window). ADDITIVE — an older client keeps rendering
      // the wall-clock pair unchanged.
      avgBusinessMinutes: bizAvg, medianBusinessMinutes: bizMedian,
      businessCount: bizDurations.length,
      businessHours: businessHours_(),
      // Cycle-13 follow-on: `pendingList` / `pendingListCap` were REMOVED. The
      // list had NO client reader — both the Spanish tab and the Dashboard card
      // use the separate, uncapped, live-read `getSpanishInboxPending`, which is
      // richer (age, snippet, permalink) and deliberately never cached because
      // it carries request content. F18 correctly flagged the silent cap on this
      // field, but the honest fix for a capped list nobody renders is to stop
      // shipping it: it put PHI-adjacent subjects into the 5-minute CacheService
      // entry for no reader. `pending` (the COUNT) is unaffected and remains
      // authoritative.
      membersConfigured: Object.keys(members).length,
      threadsScanned: threads.length,
      truncated: threads.length >= SPANISH_THREAD_SCAN_MAX || vmFold.truncated,
      // F-34 — the voicemail half of these figures, stated rather than folded
      // in silently. `vmOn` false means the fold is not configured (both
      // Script Properties unset), which is a different answer from "no
      // voicemails came in"; `vmSuppressed` / `vmUnparsed` are the same two
      // counters the pending list reports, on the same threshold.
      vmOn: vmFold.on, vmCounted: vmFold.rows.length,
      vmSuppressed: vmFold.suppressed, vmUnparsed: vmFold.unparsed,
      vmMinSeconds: vmFold.minSeconds,
    };
    cache.put(ckey, JSON.stringify(result), 300);
    return result;
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}
/** ONE voicemail fold — the 8x8 A_Q_Spanish notifications, folded the same way
 *  for the LIST and for the STATS card (F-34, cycle 20).
 *
 *  Operator 2026-08-25 added the fold to `getSpanishInboxPending` only. 8x8
 *  mails each member's individual inbox rather than the group address, so a
 *  voicemail never matches `spanishSearchQuery_` and `getSpanishInboxStats`
 *  counted none of them: the Spanish tab listed the voicemails as pending work
 *  while the card above the list, computed from the same mailbox, said a
 *  smaller number. Nothing reconciled the two, and the card is what a manager
 *  quotes. Both surfaces now read this.
 *
 *  A voicemail has no reply-based resolution semantics of its own (nobody
 *  replies to no-reply@) — it leaves pending via the manual mark-resolved /
 *  claim machinery; a member reply on the notification thread also counts,
 *  mirroring the main loop. Both filter halves blank/unset → the fold is OFF
 *  (fail-quiet), and `on` says which, so a caller can tell "no voicemails" from
 *  "not configured" (INV-187).
 *
 *  The SP4 duration gate runs BEFORE the resolution check, deliberately: a
 *  hang-up is not work on either surface, so it is neither a pending card nor
 *  a resolved request, and `suppressed` counts every one the gate hid. It
 *  FAILS OPEN — an unreadable duration is shown and counted in `unparsed`
 *  instead, because the body is a vendor artifact and the silent failure costs
 *  a patient a callback.
 *
 *  Returns the surviving threads with their resolution stamp; each caller
 *  builds its own shape from `thread`/`body` so neither pays for the other's
 *  fields (the list calls `getPermalink()`, the stats card does not). */
function spanishVmFold_(days, manual, members, haveMembers, seen) {
  const out = { rows: [], suppressed: 0, unparsed: 0, truncated: false,
                minSeconds: getSpanishVmMinSeconds_(), on: false };
  const vmSender = getSpanishVmSender_(), vmFilter = getSpanishVmFilter_();
  if (!vmSender || !vmFilter) return out;
  out.on = true;
  const vmThreads = GmailApp.search(spanishVmQuery_(vmSender, vmFilter, days), 0, SPANISH_THREAD_SCAN_MAX);
  out.truncated = vmThreads.length >= SPANISH_THREAD_SCAN_MAX;
  vmThreads.forEach(function (th) {
    const id = th.getId();
    if (seen && seen[id]) return;   // already folded in by the group-address pass
    const msgs = th.getMessages();
    if (!msgs.length) return;
    const req = msgs[0];
    // The query matches subject across the THREAD; re-check the first
    // message so a stray reply-match can't smuggle a foreign thread in.
    if (!spanishVmMatch_(req.getFrom(), req.getSubject(), vmSender, vmFilter)) return;
    // M5 (cycle 22): EVERY voicemail message in the thread is a request of its
    // own. Gmail threads same-subject mail, so a caller's repeat voicemails can
    // land in one conversation; only the FIRST was read, so once it was
    // answered (or marked resolved) every later voicemail vanished. Each is now
    // resolved only by a member reply AFTER it, or a manual resolve stamped at
    // or after it. A thread with one voicemail reads exactly as before.
    const replies = [];   // {idx, ms} of member replies, in thread order
    for (let i = 1; i < msgs.length; i++) {
      if (spanishVmMatch_(msgs[i].getFrom(), msgs[i].getSubject(), vmSender, vmFilter)) continue;
      const from = emailAddrOnly_(msgs[i].getFrom());
      if (haveMembers ? !!members[from] : !!from) replies.push({ idx: i, ms: msgs[i].getDate().getTime() });
    }
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k];
      if (k > 0 && !spanishVmMatch_(m.getFrom(), m.getSubject(), vmSender, vmFilter)) continue;
      // ONE getPlainBody(): the gate and the transcript read the same string.
      const body = String(m.getPlainBody() || '');
      const verdict = spanishVmTooShort_(spanishVmDurationSec_(body), out.minSeconds);
      if (verdict === 'short') { out.suppressed++; continue; }
      if (verdict === 'unparsed') out.unparsed++;
      const reqMs = m.getDate().getTime();
      const vm = spanishVmResolution_(k, reqMs, replies, manual && manual[id]);
      out.rows.push({ threadId: id, thread: th, from: m.getFrom(), subject: m.getSubject(), msgIndex: k,
                      reqMs: reqMs, resolveMs: vm.resolveMs, wasManual: vm.wasManual, body: body });
    }
  });
  return out;
}
/** PURE (M5, cycle 22) — how voicemail message `idx` (received `reqMs`) was
 *  resolved: by the first member reply AFTER it, else by a manual resolve
 *  stamped at or after it. A manual row with no stamp (legacy, ms 0) resolves
 *  every voicemail in the thread, as it always did — nothing says when. */
function spanishVmResolution_(idx, reqMs, replies, manualRec) {
  for (let i = 0; i < (replies || []).length; i++) {
    if (replies[i].idx > idx) return { resolveMs: replies[i].ms, wasManual: false };
  }
  if (manualRec && (!manualRec.ms || manualRec.ms >= reqMs)) {
    return { resolveMs: Math.max(reqMs, manualRec.ms || reqMs), wasManual: true };
  }
  return { resolveMs: null, wasManual: false };
}
/** Pending (unresolved) Spanish-inbox requests as task cards — canSeeSpanishInbox_-gated (INV-31 amendment),
 *  live-read (NOT cached/stored, since it carries request content). Returns
 *  subject + a short snippet + an Open-in-Gmail permalink per open thread; the
 *  full body is fetched on demand via getSpanishInboxThreadBody. PHI note: the
 *  body may reference a patient/call — that's why it's gate-restricted + never
 *  persisted. */
function getSpanishInboxPending(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, SPANISH_THREAD_SCAN_MAX);
    const manual = spanishManualResolvedMap_();
    const claims = spanishClaimsMap_();   // pilot round 2 — advisory claim per thread
    const out = [];
    const nowMs = Date.now();
    threads.forEach(function (th) {
      if (manual[th.getId()]) return;   // manually marked resolved — not pending
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const requester = emailAddrOnly_(req.getFrom());
      let resolved = false;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        if (haveMembers ? !!members[from] : (from && from !== requester)) { resolved = true; break; }
      }
      if (resolved) return;   // only pending
      const bodyRaw = String(req.getPlainBody() || '').replace(/\s+/g, ' ').trim();
      out.push({
        threadId: th.getId(),
        requester: requester,
        ageHours: Math.round((nowMs - req.getDate().getTime()) / 3600000),
        subject: req.getSubject() || '(no subject)',
        snippet: bodyRaw.slice(0, 240),
        hasMore: bodyRaw.length > 240,
        permalink: th.getPermalink(),
        claim: claims[th.getId()] || null,   // pilot round 2 — {by, assignedBy, atMs} | null
      });
    });
    // ONE voicemail fold, shared with getSpanishInboxStats since F-34.
    const seen = {};
    out.forEach(function (x) { seen[x.threadId] = true; });
    const vmFold = spanishVmFold_(d, manual, members, haveMembers, seen);
    const vmTruncated = vmFold.truncated;
    const vmSuppressed = vmFold.suppressed, vmUnparsed = vmFold.unparsed;
    const vmMinSec = vmFold.minSeconds;
    // M5: a thread can now carry several pending voicemails. The card list is
    // keyed by THREAD (resolve / claim / body all act on the thread), so one
    // card per thread: its NEWEST pending voicemail, with `vmPending` saying
    // how many are waiting. The stats card counts each one.
    const vmPendingByThread = {};
    vmFold.rows.forEach(function (r) {
      if (r.resolveMs != null) return;
      const cur = vmPendingByThread[r.threadId];
      vmPendingByThread[r.threadId] = { row: (!cur || r.reqMs > cur.row.reqMs) ? r : cur.row, n: (cur ? cur.n : 0) + 1 };
    });
    Object.keys(vmPendingByThread).forEach(function (tid) {
      const r = vmPendingByThread[tid].row;
      // SP5 — the transcript is what the rep needs; the 8x8 chrome ahead of
      // it ate almost the whole 240-char snippet. No transcript (not every
      // voicemail is transcribed) falls back to the whole-body snippet, so
      // this can only ADD information.
      const vmText = spanishVmTranscript_(r.body) || r.body.replace(/\s+/g, ' ').trim();
      out.push({
        threadId: r.threadId,
        kind: 'voicemail',
        requester: spanishVmCaller_(r.subject) || emailAddrOnly_(r.from),
        ageHours: Math.round((nowMs - r.reqMs) / 3600000),
        subject: r.subject || '(no subject)',
        snippet: vmText.slice(0, 240),
        hasMore: vmText.length > 240,
        permalink: r.thread.getPermalink(),
        claim: claims[r.threadId] || null,
        vmPending: vmPendingByThread[tid].n,   // M5 — additive; 1 for an unthreaded voicemail
      });
    });
    out.sort(function (a, b) { return b.ageHours - a.ageHours; });
    // Round 2 additive fields: `members` (the assign-select options — the same
    // internal team emails getSpanishInboxResolved already ships behind this
    // gate) and `self` (the caller's lowercased email, so the client can tell
    // "claimed by me" apart without a second identity source).
    return { address: addr, days: d, pending: out,
      truncated: threads.length >= SPANISH_THREAD_SCAN_MAX || vmTruncated,
      // SP4 — what the gate HID, and the threshold it hid it at. A filter
      // nobody can see is a filter that can fail silently forever.
      vmSuppressed: vmSuppressed, vmUnparsed: vmUnparsed, vmMinSeconds: vmMinSec,
      members: Object.keys(members), self: String(emp.email || '').trim().toLowerCase() };
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}
/** Resolved Spanish-inbox requests over the window (canSeeSpanishInbox_-gated, live-read,
 *  never stored — same posture as the pending list). For each resolved thread
 *  returns who resolved it + how long it took, newest-resolved first. PHI-lean:
 *  subject only (no body snippet — the on-demand getSpanishInboxThreadBody expand
 *  is the body path if ever needed). */
function getSpanishInboxResolved(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, SPANISH_THREAD_SCAN_MAX);
    const manual = spanishManualResolvedMap_();
    const out = [];
    threads.forEach(function (th) {
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const reqMs = req.getDate().getTime();
      const requester = emailAddrOnly_(req.getFrom());
      let resolveMs = null, resolver = '', wasManual = false;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        const isResolver = haveMembers ? !!members[from] : (from && from !== requester);
        if (isResolver) { resolveMs = msgs[i].getDate().getTime(); resolver = from; break; }
      }
      // Manual mark-resolved — an in-thread reply wins when both exist.
      if (resolveMs == null && manual[th.getId()]) {
        const man = manual[th.getId()];
        resolveMs = Math.max(reqMs, man.ms || reqMs);
        resolver = man.by;
        wasManual = true;
      }
      if (resolveMs == null) return;   // only resolved
      out.push({
        threadId: th.getId(),
        requester: requester,
        resolver: resolver,
        manual: wasManual,
        // A manual mark-resolved has NO response time (the stamp is the click,
        // not the answer) — null, the voicemail shape, never a number (2026-09-10).
        resolveMinutes: wasManual ? null : businessMinutesBetween_(reqMs, resolveMs),
        resolveWallMinutes: wasManual ? null : Math.max(0, Math.round((resolveMs - reqMs) / 60000)),
        resolvedAtMs: resolveMs,
        subject: req.getSubject() || '(no subject)',
        permalink: th.getPermalink(),
      });
    });
    // Operator 2026-08-25: manually-resolved VOICEMAILS join the resolved list
    // (and therefore the resolution-share chart, which attributes manual
    // resolves to whoever clicked). No resolveMinutes for a VM — the clock
    // would measure "notification arrived → someone clicked resolved", which
    // is not a response time — so the duration is null and consumers skip it.
    const vmSenderR = getSpanishVmSender_(), vmFilterR = getSpanishVmFilter_();
    if (vmSenderR && vmFilterR) {
      const seenR = {};
      out.forEach(function (x) { seenR[x.threadId] = true; });
      GmailApp.search(spanishVmQuery_(vmSenderR, vmFilterR, d), 0, SPANISH_THREAD_SCAN_MAX).forEach(function (th) {
        const man = manual[th.getId()];
        if (!man || seenR[th.getId()]) return;
        const msgs = th.getMessages();
        if (!msgs.length) return;
        const req = msgs[0];
        if (!spanishVmMatch_(req.getFrom(), req.getSubject(), vmSenderR, vmFilterR)) return;
        out.push({
          threadId: th.getId(),
          kind: 'voicemail',
          requester: spanishVmCaller_(req.getSubject()) || emailAddrOnly_(req.getFrom()),
          resolver: man.by,
          manual: true,
          resolveMinutes: null,
          resolvedAtMs: Math.max(req.getDate().getTime(), man.ms || 0),
          subject: req.getSubject() || '(no subject)',
          permalink: th.getPermalink(),
        });
      });
    }
    out.sort(function (a, b) { return b.resolvedAtMs - a.resolvedAtMs; });   // newest resolved first
    // Resolution-share chart (operator 2026-08-17): ship the configured member
    // list so a member who resolved NOTHING renders as a zero bar — the
    // fairness check is exactly about them. Internal team emails, behind the
    // same canSeeSpanishInbox_ gate as everything else here.
    return { address: addr, days: d, resolved: out, members: Object.keys(members),
      truncated: threads.length >= SPANISH_THREAD_SCAN_MAX };
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}
/** PURE (M5 follow-up) — which message a thread's body is read from: on a
 *  voicemail thread (its FIRST message is an 8x8 notification) the NEWEST
 *  voicemail message, with the count of voicemails; otherwise the first
 *  message (the request), vmCount 0. */
function spanishThreadBodyMessage_(msgs, vmSender, vmFilter) {
  const first = msgs[0];
  if (!spanishVmMatch_(first.getFrom(), first.getSubject(), vmSender, vmFilter)) return { msg: first, vmCount: 0 };
  let newest = first, n = 0;
  msgs.forEach(function (m, k) {
    if (k > 0 && !spanishVmMatch_(m.getFrom(), m.getSubject(), vmSender, vmFilter)) return;
    n++;
    newest = m;   // thread order is time order
  });
  return { msg: newest, vmCount: n };
}
/** Full body of one Spanish-inbox request thread (canSeeSpanishInbox_-gated, on-demand
 *  expand). Scope-guarded: only returns the body if the thread is actually
 *  addressed to the configured inbox, so a manager can't pull arbitrary thread
 *  bodies by id. Live-read, never stored. */
function getSpanishInboxThreadBody(threadId) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available.' };
    const addr = getSpanishInboxAddress_();
    // Fail closed: without a configured inbox there's no scope to guard against,
    // so refuse rather than letting an arbitrary thread id be read by id.
    if (!addr) return { error: 'Spanish inbox not configured.' };
    const th = GmailApp.getThreadById(String(threadId || ''));
    if (!th) return { error: 'Thread not found.' };
    const msgs = th.getMessages();
    if (!msgs.length) return { error: 'Empty thread.' };
    const first = msgs[0];
    // ONE scope predicate (inbox-addressed OR a configured 8x8 VM notification
    // — operator 2026-08-25); exact address match per F(cycle-8).
    if (!spanishThreadInScope_(first, addr))
      return { error: 'Not a Spanish-inbox thread.' };
    // M5 follow-up (cycle 22): a repeat caller's voicemails share a thread,
    // and the pending card shows the NEWEST one — the first message is the
    // oldest, so Expand showed a different voicemail from the snippet above
    // it. On a voicemail thread the body is the newest voicemail (the one a
    // pending card names: a reply after it would have resolved every one).
    const pick = spanishThreadBodyMessage_(msgs, getSpanishVmSender_(), getSpanishVmFilter_());
    return {
      threadId: String(threadId),
      subject: pick.msg.getSubject() || '(no subject)',
      body: String(pick.msg.getPlainBody() || '').trim().slice(0, 8000),
      vmCount: pick.vmCount,   // additive; 0 for an email request thread
      permalink: th.getPermalink(),
    };
  } catch (err) { return { error: 'Read failed: ' + err.message }; }
}
function getOrCreateSpanishResolvedSheet_() {
  const ss = getAdpSS_();
  let sh = ss.getSheetByName(SPANISH_RESOLVED_TAB);
  if (!sh) {
    sh = ss.insertSheet(SPANISH_RESOLVED_TAB);
    sh.appendRow(sheetSafeRow_([`Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`, 'ThreadId', 'ResolvedBy', 'ResolvedAtMs']));
    sh.setFrozenRows(1);
  }
  return sh;
}
/** Bounded-tail map of manually-resolved threads: { threadId: { by, ms } }.
 *  Best-effort — no tab yet (nothing ever marked) reads as empty. */
function spanishManualResolvedMap_() {
  const out = {};
  try {
    const sh = getAdpSS_().getSheetByName(SPANISH_RESOLVED_TAB);
    if (!sh) return out;
    const last = sh.getLastRow();
    if (last < 2) return out;
    const start = Math.max(2, last - SPANISH_RESOLVED_SCAN + 1);
    const rows = sh.getRange(start, 1, last - start + 1, 4).getValues();
    for (let i = 0; i < rows.length; i++) {
      const tid = String(rows[i][1] || '').trim();
      if (!tid || out[tid]) continue;
      out[tid] = { by: String(rows[i][2] || ''), ms: Number(rows[i][3]) || 0 };
    }
  } catch (e) { Logger.log('spanishManualResolvedMap_ skipped: ' + e.message); }
  return out;
}
/** Manual resolve — gated on canSeeSpanishInbox_ (the members who action the
 *  inbox + managers), SCOPE-GUARDED like getSpanishInboxThreadBody (the thread
 *  must be addressed to the configured inbox, so an arbitrary Gmail thread id
 *  can't be probed), locked (INV-01 — it appends), and idempotent. The pending
 *  list drops the thread immediately (live-read); the cached stats aggregate
 *  reflects it within its 5-min TTL (the INV-43 posture). PHI-free audit row
 *  (threadId only). */
function resolveSpanishThread(threadId) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available.' };
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured.' };
    const tid = String(threadId || '').trim();
    if (!tid) return { error: 'Missing thread id.' };
    const th = GmailApp.getThreadById(tid);
    if (!th) return { error: 'Thread not found.' };
    const msgs = th.getMessages();
    if (!msgs.length) return { error: 'Empty thread.' };
    if (!spanishThreadInScope_(msgs[0], addr))
      return { error: 'Not a Spanish-inbox thread.' };   // F(cycle-8): exact address match, not substring
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (spanishManualResolvedMap_()[tid]) return { success: true, already: true };
      getOrCreateSpanishResolvedSheet_().appendRow(sheetSafeRow_([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), tid, emp.email, Date.now(),
      ]));
    } finally { lock.releaseLock(); }
    writeAuditLog_(emp, 'SpanishInboxResolve', '', '', false, 0, 'threadId=' + tid);
    return { success: true };
  } catch (err) { return { error: 'Resolve failed: ' + err.message }; }
}
function getOrCreateSpanishClaimsSheet_() {
  const ss = getAdpSS_();
  let sh = ss.getSheetByName(SPANISH_CLAIMS_TAB);
  if (!sh) {
    sh = ss.insertSheet(SPANISH_CLAIMS_TAB);
    sh.appendRow(sheetSafeRow_([`Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`, 'ThreadId', 'Action', 'Claimant', 'Actor', 'AtMs']));
    sh.setFrozenRows(1);
  }
  return sh;
}
/** PURE (Node-pinned) — fold the append-only claim rows (OLDEST→NEWEST within
 *  the scanned tail) into { threadId: {by, assignedBy, atMs} }. The LATEST row
 *  per thread wins (unlike spanishManualResolvedMap_'s first-wins, which is
 *  fine there only because resolve is idempotent — claims genuinely change
 *  hands); a 'release' row clears the claim; junk rows are skipped.
 *  rows = [[threadId, action, claimant, actor, atMs], …]. */
function spanishClaimsFold_(rows) {
  const out = {};
  (rows || []).forEach(function (r) {
    const tid = String((r && r[0]) || '').trim();
    if (!tid) return;
    const action = String((r && r[1]) || '').trim().toLowerCase();
    if (action === 'release') { delete out[tid]; return; }
    if (action !== 'claim') return;
    const by = String((r && r[2]) || '').trim().toLowerCase();
    if (!by) return;
    const actor = String((r && r[3]) || '').trim().toLowerCase();
    out[tid] = { by: by, assignedBy: (actor && actor !== by) ? actor : '', atMs: Number(r[4]) || 0 };
  });
  return out;
}
/** Bounded-tail claim map. Best-effort — no tab yet reads as no claims. */
function spanishClaimsMap_() {
  try {
    const sh = getAdpSS_().getSheetByName(SPANISH_CLAIMS_TAB);
    if (!sh) return {};
    const last = sh.getLastRow();
    if (last < 2) return {};
    const start = Math.max(2, last - SPANISH_CLAIMS_SCAN + 1);
    return spanishClaimsFold_(sh.getRange(start, 2, last - start + 1, 5).getValues());
  } catch (e) { Logger.log('spanishClaimsMap_ skipped: ' + e.message); return {}; }
}
/** Claim a pending request (self), or — manager only — ASSIGN it to a
 *  configured member. Gated on canSeeSpanishInbox_ and SCOPE-GUARDED like
 *  resolveSpanishThread (the thread must be addressed to the configured inbox).
 *  A non-manager can claim only an UNCLAIMED thread (or re-claim their own);
 *  a manager can always reassign. Locked (INV-01 — it appends); PHI-free
 *  audit row (threadId + claimant email — internal identities, never
 *  subject/body). */
function claimSpanishThread(threadId, assigneeEmail) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available.' };
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured.' };
    const tid = String(threadId || '').trim();
    if (!tid) return { error: 'Missing thread id.' };
    const self = String(emp.email || '').trim().toLowerCase();
    const claimant = String(assigneeEmail || '').trim().toLowerCase() || self;
    if (claimant !== self) {
      if (!emp.isManager) return { error: 'Only a manager can assign a request to someone else.' };
      if (!getSpanishInboxMembers_()[claimant]) {
        return { error: 'Assignee must be a configured Spanish Inbox member (Manage → Admin → Config → Spanish bilingual members).' };
      }
    }
    const th = GmailApp.getThreadById(tid);
    if (!th) return { error: 'Thread not found.' };
    const msgs = th.getMessages();
    if (!msgs.length) return { error: 'Empty thread.' };
    if (!spanishThreadInScope_(msgs[0], addr))
      return { error: 'Not a Spanish-inbox thread.' };
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const cur = spanishClaimsMap_()[tid];
      if (cur && cur.by === claimant) return { success: true, already: true, claim: cur };
      // Advisory, but not a free-for-all: only a manager reassigns over
      // someone ELSE's live claim (the point of claiming is that teammates
      // back off — a silent steal defeats it).
      if (cur && cur.by !== claimant && !emp.isManager) {
        return { error: 'Already claimed by ' + cur.by + ' — ask them (or a manager) to release it first.' };
      }
      getOrCreateSpanishClaimsSheet_().appendRow(sheetSafeRow_([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), tid, 'claim', claimant, self, Date.now(),
      ]));
    } finally { lock.releaseLock(); }
    writeAuditLog_(emp, 'SpanishInboxClaim', '', '', false, 0,
      'threadId=' + tid + '; claim=' + claimant + (claimant !== self ? '; assigned' : ''));
    return { success: true, claim: { by: claimant, assignedBy: claimant !== self ? self : '', atMs: Date.now() } };
  } catch (err) { return { error: 'Claim failed: ' + err.message }; }
}
/** Release a claim — the claimant themself, or a manager. No Gmail scope
 *  guard needed here: a release only ever CLEARS an existing claim row (it
 *  can't seed junk for arbitrary thread ids), and requiring one would cost a
 *  Gmail read to remove a chip. Locked; idempotent; PHI-free audit row. */
function releaseSpanishThread(threadId) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    const tid = String(threadId || '').trim();
    if (!tid) return { error: 'Missing thread id.' };
    const self = String(emp.email || '').trim().toLowerCase();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const cur = spanishClaimsMap_()[tid];
      if (!cur) return { success: true, already: true };
      if (cur.by !== self && !emp.isManager) {
        return { error: 'Only the claimant or a manager can release this claim.' };
      }
      getOrCreateSpanishClaimsSheet_().appendRow(sheetSafeRow_([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), tid, 'release', cur.by, self, Date.now(),
      ]));
    } finally { lock.releaseLock(); }
    writeAuditLog_(emp, 'SpanishInboxClaim', '', '', false, 0, 'threadId=' + tid + '; release');
    return { success: true };
  } catch (err) { return { error: 'Release failed: ' + err.message }; }
}

// ── Spanish inbox — auto-assign (operator testing note 4, 2026-09-10) ───────
// "Auto-assign for equal distribution" — the operator asked for the BUTTON
// first; a scheduled trigger may follow. The pick is a pure, Node-pinned
// least-loaded fold so a trigger can reuse spanishAutoAssignCore_ unchanged:
// every UNCLAIMED pending request (voicemails included — they are worked the
// same way) goes to the configured member with the fewest live claims,
// oldest request first, alphabetical tie-break so two runs over the same
// state pick the same member. Existing claims on still-PENDING requests are
// RESPECTED as load (M4 — a claim on a resolved request is history, not load)
// and never reassigned (a manager's deliberate Assign is not undone by a button).
// Writes are ONE lock + ONE batched setValues over the claims tab; the audit
// row is counts-only (thread ids and emails are internal, but the row need
// carry neither).
/** PURE (Node-pinned) — least-loaded distribution.
 *  unclaimed: [{threadId}] in the order to assign (oldest first);
 *  members:   [email, …] (any order; deduped/lowercased by the caller);
 *  load:      {email: liveClaimCount} — existing claims count toward balance.
 *  Returns [{threadId, by}]; an empty member list assigns nothing. */
function spanishAutoAssignPick_(unclaimed, members, load) {
  const ms = (members || []).slice().sort();
  if (!ms.length) return [];
  const cur = {};
  ms.forEach(function (m) { cur[m] = Number((load || {})[m]) || 0; });
  const out = [];
  (unclaimed || []).forEach(function (u) {
    const tid = String((u && u.threadId) || '').trim();
    if (!tid) return;
    let best = ms[0];
    ms.forEach(function (m) { if (cur[m] < cur[best]) best = m; });
    cur[best]++;
    out.push({ threadId: tid, by: best });
  });
  return out;
}
/** PURE (Node-pinned) — M4 (cycle 22): the LOAD a member carries is their
 *  claims on requests that are still PENDING. A claim is never released when
 *  its request is resolved (resolve writes its own tab; the claim row stays),
 *  so counting every claim in the map counted a member's whole history. The
 *  member who had worked the most requests looked the busiest for ever, and a
 *  new member received nearly every assignment until their total caught up.
 *  liveMap: spanishClaimsMap_() ({threadId: {by, …}}); pendingIds: {threadId:
 *  true} for every request still pending. Returns {email: count}. */
function spanishOpenLoad_(liveMap, pendingIds) {
  const load = {};
  Object.keys(liveMap || {}).forEach(function (tid) {
    if (!(pendingIds || {})[tid]) return;
    const by = liveMap[tid] && liveMap[tid].by;
    if (by) load[by] = (load[by] || 0) + 1;
  });
  return load;
}
/** The reusable body — takes the ALREADY-GATED caller so a scheduled trigger
 *  (INV-44 gate) and the button (manager gate) share one implementation.
 *  Returns { success, unclaimed, assigned: [{threadId, claim}] }. */
function spanishAutoAssignCore_(emp, days) {
  const members = Object.keys(getSpanishInboxMembers_());
  if (!members.length) return { success: false, error: 'No Spanish Inbox members are configured (Manage → Admin → Config → Spanish bilingual members).' };
  const pendingRes = getSpanishInboxPending(days);
  if (!pendingRes || pendingRes.error) return { success: false, error: (pendingRes && pendingRes.error) || 'Pending read failed.' };
  const unclaimed = (pendingRes.pending || []).filter(function (p) { return !(p && p.claim && p.claim.by); });
  const pendingIds = {};
  (pendingRes.pending || []).forEach(function (p) { if (p && p.threadId) pendingIds[p.threadId] = true; });
  if (!unclaimed.length) return { success: true, unclaimed: 0, assigned: [] };
  const self = String(emp.email || '').trim().toLowerCase();
  const nowMs = Date.now();
  const stamp = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
  let picks = [];
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    // Load + the unclaimed set are re-derived from the LIVE claim map inside
    // the lock, so a claim that landed between the read and the lock is
    // respected rather than overwritten.
    const live = spanishClaimsMap_();
    const load = spanishOpenLoad_(live, pendingIds);   // M4 — open requests only, never the history
    const stillUnclaimed = unclaimed.filter(function (p) { return !live[p.threadId]; });
    picks = spanishAutoAssignPick_(stillUnclaimed, members, load);
    if (picks.length) {
      const rows = picks.map(function (pk) { return [stamp, pk.threadId, 'claim', pk.by, self, nowMs]; });
      // appendRowsSafe_ grows the grid first: a positional write past the last
      // grid row throws, so once SpanishClaims outgrew its 1000-row default
      // every auto-assign run would have failed (the cycle-22 C1 class).
      appendRowsSafe_(getOrCreateSpanishClaimsSheet_(), rows);
    }
  } finally { lock.releaseLock(); }
  writeAuditLog_(emp, 'SpanishInboxAutoAssign', '', '', false, 0,
    'assigned=' + picks.length + '; members=' + members.length);
  return {
    success: true,
    unclaimed: unclaimed.length,
    assigned: picks.map(function (pk) { return { threadId: pk.threadId, claim: { by: pk.by, assignedBy: self, atMs: nowMs } }; }),
  };
}
/** The button. MANAGER-gated (a distribution decision, like Assign — not the
 *  canSeeSpanishInbox_ tier: a member auto-assigning the whole queue to their
 *  teammates is the thing claims exist to prevent). Writer shape. */
function autoAssignSpanishThreads(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    return spanishAutoAssignCore_(emp, days);
  } catch (err) { return { success: false, error: 'Auto-assign failed: ' + err.message }; }
}
function autoAssignSpanishThreadsScheduled() {
  assertManagerCaller_('autoAssignSpanishThreadsScheduled');  // see sendDailyMissedPunchAlerts note
  try {
    stampDigestLastRun_('spanishAutoAssign');
    if (!getFlag_('spanishAutoAssign')) { Logger.log('spanishAutoAssign flag is off — nothing assigned.'); return; }
    const nowMs = Date.now();
    // Inside the business window iff the next minute counts as a business
    // minute — the same helper that times every request, so "working hour"
    // has exactly one meaning. null (unusable input) reads as NOT inside.
    const bizMin = businessMinutesBetween_(nowMs, nowMs + 60000);
    if (!(bizMin > 0)) { Logger.log('spanishAutoAssign: outside business hours — nothing assigned.'); return; }
    const emp = getEmployeeInfo_() || _SYSTEM_AUDIT_EMP_;
    const r = spanishAutoAssignCore_(emp, SPANISH_AUTO_ASSIGN_DAYS);
    if (!r || !r.success) {
      const why = (r && r.error) || 'auto-assign failed';
      Logger.log('spanishAutoAssign: ' + why);
      stampAutomationError_('SpanishAutoAssign', why);
      return;
    }
    clearAutomationError_('SpanishAutoAssign');
    Logger.log('spanishAutoAssign: ' + (r.assigned || []).length + ' assigned of ' + (r.unclaimed || 0) + ' unclaimed.');
  } catch (err) {
    Logger.log('autoAssignSpanishThreadsScheduled failed: ' + err.message);
    stampAutomationError_('SpanishAutoAssign', err.message);
  }
}
/** Admin-gated (INV-136 / INV-57 family): persist the Spanish bilingual member
 *  list to Script Property SPANISH_INBOX_MEMBERS (operator 2026-08-18 — the
 *  in-app replacement for editing the property by hand). The list does DOUBLE
 *  duty, which is why an Admin edit takes effect everywhere at once: a reply
 *  from a member counts a thread resolved + attributes it on the
 *  Resolution-share chart (idle members render zero bars), AND membership
 *  gates the Spanish Inbox tab / Dashboard card via canSeeSpanishInbox_
 *  (INV-31 amendment). An EMPTY list is valid — "any reply resolves" +
 *  managers-only access, today's unset behavior. Validation: email shape,
 *  lowercased + deduped, cap 30. No cache flush needed — the stats cache key
 *  already hashes the member set (spanishCacheHash_), so a save naturally
 *  misses the stale entry. Writes an AdminConfigChange audit row. */
function saveSpanishInboxMembers(emails) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(emails)) return { success: false, error: 'Expected a list of member emails.' };
    if (emails.length > 30) return { success: false, error: 'Too many members (max 30).' };
    const seen = {};
    const clean = [];
    for (let i = 0; i < emails.length; i++) {
      const e = String(emails[i] || '').trim().toLowerCase();
      if (!e) continue;
      if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e)) {
        return { success: false, error: 'Not a valid email: "' + e + '"' };
      }
      if (!seen[e]) { seen[e] = true; clean.push(e); }
    }
    propSetBounded_('SPANISH_INBOX_MEMBERS', clean.join(','), { hint: 'remove a member' });
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'Updated Spanish inbox members (' + clean.length + ')', emp.email);
    return { success: true, members: clean };
  } catch (err) { return { success: false, error: err.message }; }
}
