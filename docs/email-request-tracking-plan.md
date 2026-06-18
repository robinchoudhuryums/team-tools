# Plan: email request tracking (Spanish pending-as-tasks + inter-department)

Two related asks. Both are about turning "an email was sent / received" into a
**tracked, resolvable task** with timing. This doc plans both; the inter-dept
build proceeds once the decisions at the bottom are confirmed.

---

## PART A — Spanish inbox: show pending emails as tasks (with body)

**Today:** the Metrics → Spanish Inbox tab (`getSpanishInboxStats`) is PHI-free —
it shows pending **count** + requester email + age only, never the body.

**Ask:** show each pending (unresponded) email as a **task card with the request
details / body**, so a member can read + act on it from the app.

**Feasibility:** yes. `GmailApp` already gives us the threads; each message
exposes `getSubject()`, `getPlainBody()`, and `thread.getPermalink()` (a direct
"open in Gmail" link).

**⚠️ The one real consideration — PHI boundary.** The current tab is
deliberately PHI-free. A bilingual-assistance request body may reference a
patient/call, so showing the **body** surfaces request content in-app. Proposal
to keep this safe:
- **Manager-/member-gated only** (same gate as the tab today).
- **Live-read, never stored** — bodies are fetched on view and not written to any
  sheet/cache beyond the existing 5-min stats cache (which we'd keep
  body-free; bodies come from a separate on-demand call).
- Show a **snippet by default** with an **"Open in Gmail"** permalink as the
  primary action (so the member acts in Gmail, where they'd reply anyway), and an
  expand-to-full-body toggle.

**Plan:**
1. New endpoint `getSpanishInboxPending()` (manager-gated) → returns the open
   threads with `{ requester, ageHours, subject, snippet, permalink }` (full
   body behind an explicit per-thread `getSpanishInboxThreadBody(threadId)` call
   so the list stays light + the body is fetched only when expanded).
2. Spanish-inbox tab: render the pending list as **task cards** (requester · age
   SLA color · subject · snippet · "Open in Gmail" + "Show full request").
3. Keep the aggregate strip (resolved/avg/median) from the existing endpoint.

Effort: small-medium. No new operator state (Gmail scope already added in v1).

---

## PART B — Inter-department request tracking

**Goal:** an agent emails another department asking for an action; track **how
long until it's resolved**, and let the **receiving agent mark it resolved with
one click** (your "checkbox in the email" idea — agreed it's the better design).

**Architecture finding:** the Employees roster has **no per-employee department
column** (only a `DEPARTMENT_EMAILS` name→email map). So we **can't route an
in-app "incoming requests" inbox by department**. The clean, low-friction path
is a **"Mark resolved" link in the email** the recipient already received — they
click it, the app records the resolution. Recipients are internal
(`@umsupply.com`), so the link works with normal auth (no anonymous-access block,
unlike the external `?form` route).

### Data model
A PHI-free `DeptRequests` tab (dedicated `DEPT_REQUESTS_SS_ID` sheet, or reuse
the forms/intake sheet):
`requestId (uuid) · createdByEmpId · createdByName · createdByEmail · toDept ·
toEmail · createdAt · status (open|resolved) · resolvedAt · resolvedByEmail ·
label`. **No email body stored** — `label` is a short, sender-supplied,
non-PHI tag (e.g. "auth follow-up"); the actual request lives in the email.

### Create flow
Extend the existing **department/external email composer** (Call Notes) with a
**"Track resolution"** toggle. When on, on send:
- generate `requestId`, write an `open` row,
- embed a branded **"✓ Mark this resolved"** button in the email →
  `<webapp>/exec?resolve=<requestId>`.

### Resolve route (the "checkbox")
`doGet` gains a `?resolve=<token>` branch → `serveResolvePage_`:
- validate the token; identify the visitor via `getActiveUserEmail_()`.
- if internal + token open → set `status=resolved`, `resolvedAt`,
  `resolvedByEmail`; show a branded "Marked resolved — thanks!" page.
- **idempotent**: already-resolved → show who/when; unknown token → friendly error;
  unidentifiable visitor → "open this from your @umsupply.com account".
- write a PHI-free `DeptRequestResolved` audit row.

### Surfaces
- **Sender:** a "My requests" view (open + resolved, with elapsed time) so the
  sender sees status without leaving the app.
- **Manager (Metrics → "Dept Requests"):** open/resolved counts, **avg
  time-to-resolve per department**, oldest-open list, trend. Manager-gated.

### Operator state / scopes
- No new OAuth scope (MailApp already used for sending).
- One Script Property for the store id (`DEPT_REQUESTS_SS_ID`) if we use a
  dedicated sheet (recommended — keeps it off payroll/PHI sheets).
- The resolve route reuses the existing web-app deployment (`/exec`).

### Tests
- Pure: token shape, idempotent resolve transition (open→resolved once),
  manager-gate on the metrics endpoint.
- Integration (editor): create→resolve→metrics roundtrip.

### Phasing
- **v1:** tracked-send toggle + email "Mark resolved" button + `?resolve` route +
  sender "My requests" + manager metrics.
- **v2:** stale-open reminder nudges (digest pattern), per-dept SLA targets, a
  generalized "any internal request" (not just dept emails).

---

## Decisions to confirm before building Part B
1. **Spanish bodies (Part A):** OK to surface request bodies in the manager/member
   tab (live-read, not stored, "Open in Gmail" primary)? *(recommend yes)*
2. **Resolve mechanism (Part B):** the **receiver clicks a "Mark resolved" link in
   the email** (recommended — works without a department roster) — confirm vs.
   sender-marks-resolved.
3. **Store (Part B):** a dedicated `DEPT_REQUESTS_SS_ID` sheet *(recommended)* vs.
   reusing the Intake/forms sheet.
4. **Where the "Track resolution" toggle lives:** the Call Notes department /
   external email composer *(recommended)* — confirm that's the right entry point
   (vs. a standalone "New request" form).
