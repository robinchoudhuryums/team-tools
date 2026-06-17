# Spec — Training & Employee Docs module

Status: **COMPLETE — all phases shipped 2026-06-12.
T1 (training core — CLAUDE.md INV-120 / S67), T2 (quizzes — INV-121 / S68),
T3 (employee docs — INV-122 / S69). Operator prerequisites for T3 going
live: set Script Property `HR_DOCS_SS_ID` (dedicated spreadsheet) and fill
roster column M (`ManagerEmail`). T4 items (overdue digests, Drive
snapshot-to-PDF signing, quiz analytics) remain on-demand. The shipped
reality is documented in CLAUDE.md; this file is historical context.**
Authored 2026-06-12, from the feasibility discussion in-session. This is a
design document; nothing here is built. When implementation ships, the
shipped reality gets documented in CLAUDE.md (decisions, gotchas,
invariants) and this file becomes historical context.

## 1. Summary

One new tool in the web-app `TOOLS` registry with two functional areas:

- **Training** — manager-assigned training items (existing Reference/KB
  articles and embeds, plus interactive quizzes) with per-employee
  completion tracking. Rep sees a checklist; manager sees a completion
  matrix. PHI-free, low risk — the Reference module already built most
  of the content layer.
- **Employee Docs** — per-employee documents (annual performance review,
  PIP, policy acknowledgments) issued by a manager, visible ONLY to that
  employee + managers, with an acknowledgment-grade signature flow
  reusing the forms-hardening machinery (tamper-evident hash,
  append-only record).

These ship in phases (§8): Training core → Quizzes → Employee Docs.
Employee Docs is deliberately LAST — it is gated on the operator
decisions in §9 (ADP overlap, signature legal weight).

## 2. Tool registry & client shape

New `TOOLS` entry (key `develop`, label **"Training & Employee Docs"** —
per §9.5). Four tabs, keys globally unique:

| Tab key | Label | Audience | Enter handler |
|---|---|---|---|
| `trainingHome` | My Training | all reps | `enterTrainingHomeView` |
| `trainingManage` | Team Training | managers (managerOnly) | `enterTrainingManageView` |
| `myDocs` | My Docs | all reps | `enterMyDocsView` |
| `docsManage` | Issue Docs | managers (managerOnly) | `enterDocsManageView` |

Partials: `web-app/train/script_training.html` +
`web-app/train/script_empdocs.html`, `include()`d from `index.html` —
the standard new-tool path. Reuses `kbMd_` for article rendering, the
shared overlay vocabulary via `ensureOverlay` (mandatory for any new
dynamic modal), `esc()` before every `innerHTML` write, and `uiConfirm`
for destructive/confirm actions. `enterTool`'s existing managerOnly
bump keeps a stale `umsLastView` safe for reps.

## 3. Storage

Two stores with OPPOSITE access models — the storage split is the real
security boundary, not the tab-level gating:

### 3a. Training tracking — new tabs in the existing KB spreadsheet (`KB_SS_ID`)

Training CONTENT is just KB items (articles/embeds; the editor,
converter, renderer, search all already exist). Tracking co-locates in
the KB spreadsheet because it shares the KB's posture exactly: PHI-free,
deployer-only sheet access, server-mediated reads. Zero new operator
state. Tabs auto-provision on first use (the `getOrCreate*` pattern):

- **`TrainingAssignments`** — one row per assignment:
  `assignId (uuid), itemType ('kb'|'quiz'), itemId, empId ('*' = all),
  assignedBy, assignedAt, dueDate ('' = none)`.
  Append-only in spirit; un-assignment writes a `revokedAt` rather than
  deleting (keeps the history legible).
- **`TrainingCompletions`** — append-only, one row per completion event:
  `empId, itemType, itemId, completedAt, via ('read'|'quiz'),
  quizAttemptId ('')`.
- **`Quizzes`** — one row per quiz:
  `quizId (uuid), title, kbItemId ('' = standalone), passPct,
  questionsJson, updatedBy, updatedAt`.
  `questionsJson` INCLUDES the correct-answer indices — server-only,
  never shipped to the client (§5, INV-Q below).
- **`QuizAttempts`** — append-only:
  `attemptId (uuid), quizId, empId, submittedAt, scorePct, passed,
  perQuestionJson` (per-question right/wrong booleans only — never the
  rep's raw answers paired with the key).

**Completion semantics:** an item counts complete for a rep iff the
latest non-revoked assignment row for (item, emp-or-*) has
`assignedAt < completedAt` of some completion row. Re-assigning an item
(new row, later `assignedAt`) therefore resets it — that's the
"annual re-certification" mechanism, no extra machinery. Editing a KB
article does NOT auto-reset completions (KB rows carry no content hash);
a manager who wants re-reads re-assigns.

### 3b. Employee Docs — NEW dedicated spreadsheet (`HR_DOCS_SS_ID`)

Never co-located with the KB (broadly rep-readable by policy), the ADP
sheet (payroll), or the PHI sheets. New Script Property
`HR_DOCS_SS_ID`; deployer needs edit access; tabs auto-provision:

- **`EmpDocs`** — one row per issued doc:
  `docId (uuid), empId, docType ('review'|'pip'|'policy'|'other'),
  title, bodyMd, contentHash, requiresSignature (bool), status
  ('issued'|'signed'|'void'), issuedBy, issuedAt, dueAt, signedAt`.
  `bodyMd` is the FROZEN markdown content (§4); `contentHash` is
  computed at issue over `bodyMd + title + docType + empId`.
- **`DocSignatures`** — append-only, the attested record (mirrors the
  `FormSubmissions` hardening):
  `docId, empId, signedAt, signatureDataUrl, ackTextVersion,
  SignatureHash, Certificate`.
  `SignatureHash` = SHA-256 over
  `contentHash + empId + docId + signatureDataUrl + ackTextVersion` —
  deliberately NOT over `signedAt` (Sheets coerces ISO datetimes to
  Dates on read and breaks recompute — the INV-113 lesson). The
  append-only `EmpDocSigned` audit row carries `hash=` + `signedAt=`
  as the independent timestamp witness, exactly like
  `FormSubmissionReceived`.

**Team scoping (per §9.3):** manager visibility into employee docs is
PER-TEAM, not all-managers. The roster gains a new column —
**Employees column M = `ManagerEmail`** (`EMP.MANAGER_EMAIL = 12`) —
mapping each employee to their manager. This is an `EMP` enum shape
change, so `ROSTER_CACHE_KEY` bumps (v5 → v6, INV-28) and the column is
a new Operator State item (fill it for every employee who will receive
docs). The visibility rule is **fail-closed**: a doc is readable by
(a) the employee it belongs to, (b) the manager who issued it
(`issuedBy`), and (c) the manager listed in the employee's
`ManagerEmail` cell. A blank `ManagerEmail` does NOT widen to all
managers — it narrows to (a)+(b) only. Any manager can still ISSUE a
doc to any employee (issuing reveals nothing about existing docs);
reading and the dashboard are scoped. The deployer can always open the
spreadsheet itself — this scoping governs the app surface, which is
where accidental exposure would happen. Training dashboards (§5) are
deliberately NOT team-scoped — they stay all-managers-see-all-reps,
matching every other manager surface in the app (`managerGetShiftStats`,
`getTeamMetrics`, etc.); only Employee Docs carry the elevated
confidentiality.

**Retention is the OPPOSITE of the PHI sheets:** HR records must be
kept, not minimized. `EmpDocs` / `DocSignatures` are explicitly
EXCLUDED from every purge job; no retention trigger is ever pointed at
this spreadsheet. Departed employees' rows stay; roster lookups that
miss render "former employee" rather than erroring.

All new timestamp columns are written in `CONFIG.TIMEZONE` and read
through Date-coercion guards (the FormTokens-tz and `normalizeAuditTs_`
lessons — assume every datetime cell comes back as a Date).

## 4. Signable content is frozen at issue (the integrity rule)

A signature is only meaningful if the signed content can't change
afterward. Therefore:

- **Phase 3 signable docs are markdown-only**, stored in the `EmpDocs`
  row at issue and hashed (`contentHash`). Rendered via `kbMd_` (same
  escape-first boundary as the KB).
- Managers authoring reviews in Google Docs use the EXISTING
  `kbConvertDriveDoc` converter at issue time — paste the Doc URL, the
  converter produces the markdown, the manager reviews it in the issue
  modal, and the frozen copy is what gets signed. The Drive original
  stays untouched (the converter is read-only, INV-115).
- Drive EMBEDS are view-only in this module (no signature) — a Doc the
  manager can silently edit after signing is an integrity hole. A
  Phase-4 option (snapshot-to-PDF at sign time, hash the PDF, store it
  in a deployer-owned "HR Docs Signed" Drive folder — the Phase 2b
  export machinery) can lift this later if embeds-with-signature are
  ever genuinely needed.

**Signature pad reuse:** the canvas pad lives in `form_public.html`,
which deliberately `include()`s no internal partials (its standalone
posture is a security boundary for anonymous visitors). Two options:
(a) extract the pad into a shared `script_sigpad.html` included by both
(leaks only inert pad code to the public page — acceptable), or
(b) copy the pad into the app partial and pin the two copies with a
Node parity test (the `LEAVE_DEDUCTION_CLIENT` discipline).
Recommendation: **(b)** — don't disturb the public page's posture for a
~100-line pad. Remember the 0-width-canvas gotcha: re-run resize when
the pad's container becomes visible.

## 5. Server endpoints

All follow the established invariant families: ScriptLock on every
mutation (INV-01), `callerEmp.isManager` on every manager endpoint
(INV-02, added to the CLAUDE.md gate list + `test_managerGates_rejectNonManager`),
caller-scoping on every rep endpoint (INV-11), audit row on every state
change (INV-08/32), best-effort email (INV-14).

### Training (rep-callable)
- `getMyTraining()` — caller-scoped. Resolves the rep's effective
  assignment set (`empId` rows + `'*'` rows, minus revoked), joins
  completion status + quiz state, returns the checklist. Bounded reads
  (column-scan first, the INV-46 discipline).
- `markTrainingComplete(itemId)` — locked. Valid only for `kb`-type
  items whose latest assignment has no quiz attached; appends a
  `TrainingCompletions` row (`via='read'`); audit `TrainingComplete`
  (itemId + empId only). Honor-system by design; `kbRecordView` rows
  corroborate if a manager ever wonders.
- `getQuiz(quizId)` — returns title + questions + options with the
  correct-answer indices and explanations STRIPPED server-side.
- `submitQuizAttempt(quizId, answers[])` — locked. Grades server-side
  against `questionsJson`; appends `QuizAttempts`; on `scorePct >=
  passPct` also appends a `TrainingCompletions` row (`via='quiz'`).
  Returns score + per-question right/wrong booleans ONLY — correct
  options are NEVER revealed, pass or fail (§9.4). Unlimited retries;
  attempt counts are tracked per (quiz, emp) and surfaced on both the
  rep's checklist ("passed on attempt 3") and the manager matrix.
  Audit `QuizAttempt` (quizId, score, passed, attempt # — never
  question text).

### Training (manager-gated)
- `getTrainingDashboard()` — completion matrix (reps × items),
  overdue flags vs `dueDate`, quiz score summaries.
- `saveTrainingAssignment({itemType, itemId, empIds|'*', dueDate?})` /
  `revokeTrainingAssignment(assignId)` — locked; audit
  `TrainingAssign` / `TrainingRevoke`.
- `saveQuiz(quizDef)` / `deleteQuiz(quizId)` — locked; validates schema
  (MC/TF only; 1–50 questions; 2–6 options each; `correct` in range;
  `passPct` 0–100); audit `QuizSave` / `QuizDelete`.

### Employee Docs (rep-callable)
- `getMyDocs()` — caller-scoped to `empId`: metadata list only (docId,
  type, title, status, issuedAt, dueAt) — never another rep's rows.
- `getMyDoc(docId)` — owner-or-AUTHORIZED-manager scoped (§3b team
  rule: owner, issuer, or the employee's roster `ManagerEmail`);
  returns the frozen `bodyMd` + status + (if signed) the signature
  record summary.
- `acknowledgeDoc(docId, signatureDataUrl)` — locked, OWNER-only
  (managers cannot sign on behalf — the signature's value is that the
  employee made it). Validates: doc exists, belongs to caller,
  `requiresSignature`, status `'issued'` (not already signed / void).
  Recomputes `contentHash` from the stored row and verifies it before
  accepting the signature (a tampered row refuses to sign). Writes the
  `DocSignatures` row + flips `EmpDocs.status='signed'` in the same
  lock; audit `EmpDocSigned`. Signature payload bounded (the INV-96
  caps; the pad export already downscales to ≤600px).

### Employee Docs (manager-gated)
- `issueDoc({empId, docType, title, bodyMd, requiresSignature, dueAt})` —
  locked; computes + stores `contentHash`; audit `EmpDocIssue`
  (docId + empId + docType — never the title or body, which can carry
  employment-sensitive content; same minimization instinct as the
  PHI-free CallNoteEmail row).
- `getDocsDashboard()` — TEAM-scoped (§3b): only docs the caller is
  authorized for (issuer or roster `ManagerEmail` match); signature
  status, overdue unsigned.
- `voidDoc(docId, reason)` — locked; sets `status='void'` (NEVER
  deletes, never edits `bodyMd` after issue — a correction is a new
  issued doc); audit `EmpDocVoid`. A signed doc cannot be voided
  silently: voiding a signed doc keeps the `DocSignatures` row intact
  and the dashboard shows "signed, later voided".
- `verifyDocSignature(docId)` — read-only; recomputes `SignatureHash`
  and reports match / mismatch / legacy (the
  `verifyFormSubmissionIntegrity_` twin).

### Notifications (all best-effort, branded via `buildBrandedEmailHtml_`)
- Issue → employee gets "you have a document to review/sign".
- Sign → issuing manager gets confirmation.
- Training assignment → employee notification (batched per save).
- Overdue nudges are Phase 4 (a digest-style trigger, heartbeat-stamped
  like the existing digests) — NOT in the first build.

## 6. Privacy / integrity invariants (to be numbered INV-120+ at implementation)

1. **HR-docs caller-scoping** — `getMyDocs`/`getMyDoc`/`acknowledgeDoc`
   are owner-scoped; manager read access is TEAM-scoped per §3b
   (issuer or roster `ManagerEmail`, fail-closed on blank — being in
   `MANAGER_EMAILS` alone does NOT grant read). NO endpoint returns
   another rep's doc metadata or content outside that set. The scoping
   tests are written BEFORE the endpoints (this module's leak blast
   radius — a coworker OR an unrelated manager reading a PIP — is the
   highest in the app outside PHI).
2. **Signature records are append-only + tamper-evident** — hash
   excludes the timestamp (Sheets coercion); the audit row is the
   independent witness; no edit endpoint exists for `DocSignatures` or
   for `EmpDocs.bodyMd` post-issue (§164.312(c)-style discipline,
   applied to HR records voluntarily).
3. **Signable content frozen at issue** — markdown + `contentHash` in
   the row; Drive embeds non-signable in Phases 1–3.
4. **Quiz answer keys never leave the server** — `getQuiz` strips them;
   grading is server-side; pinned by a test that asserts the `getQuiz`
   response shape carries no `correct`/`explain` keys.
5. **Shared AuditLog rows stay content-free** — docId/type/score only;
   never review text, quiz question text, or doc titles.
6. **HR-docs store excluded from all retention purges** — and every new
   timestamp column reads through a coercion guard.

## 7. Tests

- Editor suite: gate cases for every new manager endpoint (extend
  `test_managerGates_rejectNonManager`), owner-scoping cases
  (`getMyDoc` cross-rep rejection, `acknowledgeDoc` non-owner
  rejection), sign-twice rejection, void-after-sign behavior,
  hash verify round-trip + tamper detection, quiz grading (pass /
  fail / malformed answers), completion-resets-on-reassign.
- Node harness: quiz-schema validator (pure), `getQuiz` strip
  assertion, signature-pad parity test (if option (b) in §4),
  client checklist/matrix render helpers.
- New regression scenarios (S67+) at implementation time: training
  assign→complete→matrix walk; quiz authoring→attempt→pass walk;
  issue→sign→verify→tamper-detect walk.

## 8. Phasing & rough effort

| Phase | Scope | Effort |
|---|---|---|
| T1 | Training core: assignments, mark-complete, rep checklist, manager matrix, notifications | ~1 session |
| T2 | Quizzes: schema + editor, server grading, attempts, auto-completion | ~1 session |
| T3 | Employee Docs: issue (markdown-frozen + converter reuse), view, sign, verify, dashboard | ~1–1.5 sessions |
| T4 (optional) | Overdue digests ✅ + quiz analytics ✅ (shipped); Drive snapshot-to-PDF signing + re-certification schedules still on demand | partial |

All gates cleared 2026-06-12 (§9). Build order: T1 → T2 → T3.
One operator prerequisite for T3: fill the new Employees column M
(`ManagerEmail`) for every employee who will receive docs (§3b).

## 9. Operator decisions — RESOLVED 2026-06-12

1. **ADP overlap — NO overlap; T3 cleared.** ADP's document
   acknowledgment only covers US employees; this module's audience is
   the non-US team, which ADP cannot serve. No parallel
   source-of-record risk. (Corollary: signers are offshore — the
   timestamp/timezone discipline in §3b matters, and ack-language
   should be plain English suitable for non-US-jurisdiction staff.)
2. **PIP signature legal weight — CONFIRMED acceptable.** The in-house
   authenticated-session acknowledgment (hash + audit trail) is
   sufficient; no certified e-sign vendor required.
3. **Manager visibility — PER-TEAM, not all-managers.** Resolved as
   the §3b team-scoping rule: new roster column M `ManagerEmail`
   (`EMP.MANAGER_EMAIL`), visibility = owner + issuer + listed
   manager, fail-closed on blank. `ROSTER_CACHE_KEY` bumps v5 → v6.
4. **Quiz policy — unlimited retries; NEVER reveal correct answers**
   (pass or fail — only per-question right/wrong is shown); attempt
   counts tracked and surfaced to rep + manager.
5. **Naming — "Training & Employee Docs"** (tool label). `docType`
   vocabulary stays `'review' | 'pip' | 'policy' | 'other'`.
