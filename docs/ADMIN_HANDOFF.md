# Handoff: UMS Team Tools — Manage › Admin

## Overview
A structural pass over the Admin view, focused on the **System details** section.
**Target:** `web-app/cn/script_callnotes.html` (`enterCallNotesAdminView` and the health/storage
panels). **Reference:** `Admin Redesign.dc.html` (sections 01–04).

Built on the existing Console token system — no new framework, colour, font, or icon. As with the
Coaching, Manage and QA handoffs, the mock inlines literal hex because a Design Component cannot
reference the app's stylesheet; **use the token variable** in the codebase.

**No new server endpoints.** Everything here re-arranges and re-ranks payloads already fetched by
`getAutomationHealth`, `getStorageHealth`, `getDeployReadiness`, `getCallNotesAmbient` and the
usage aggregate.

## Decisions taken from you
| Question | Answer |
|---|---|
| Where should System Details live? | **Its own sub-tab** |
| Deployed yet? | **Yes** — deploy readiness can move/collapse |
| Queue-inventory question settled? | **Not yet** — keep it visible |
| Rename the page? | **"Admin" under Manage** |

---

# 1 · The finding

System health is now three status cards + automation health + storage health + client errors +
deploy readiness + the queue inventory. That is **more content than the Tags or Compliance
sub-tabs**, and it is folded into an unlabelled disclosure at the bottom of Overview.

Six specific problems with that arrangement:

1. **The disclosure has no summary.** The button is a chevron and the words "System details".
   Collapsed, a manager cannot tell whether opening it shows all-clear or three failures.
2. **Its summary is detached from it.** The three status cards *are* the folded summary — the
   source comment says so — but `#cn-admin-kpis` and `#cn-admin-usage` are injected between them
   and the button, so the relationship isn't expressed. That's slot ordering, not a decision.
3. **The status cards aren't clickable.** The obvious gesture on a warning card is "show me why".
   `cnSetSysCard_` renders no affordance, so the reader scrolls past two unrelated panels instead.
4. **One toggle opens two unrelated concerns.** `#cn-admin-health` (sync failures, witness losses,
   client errors, CDR feed, digests) and `#cn-admin-storage` (per-spreadsheet config, reachability,
   tz, locale) each have their own status card but share one disclosure. Chasing a CDR warning
   means scrolling the whole storage inventory.
5. **All-clears cost as much space as problems.** `okLine()` renders a full row per passing check,
   so a healthy system produces a column of green sentences and an unhealthy one buries the real
   warning among them. Inverted — see §4.
6. **State isn't persisted.** `cnToggleSysDetails_` reads `style.display` and never writes to
   `CN_STATE`, unlike `adminTab` immediately beside it. Leave Admin and it re-collapses. It is
   also missing `aria-controls`.

---

# 2 · Rename and re-title

The page renders `cnViewTitleBar_('Call Notes · Admin', 'KPIs, tag taxonomy, and department/tax
config…')`. Both are stale. It now governs storage for **every** spreadsheet the app touches,
automation triggers, client-error telemetry, retention windows, the allowlisted sheet viewer,
training sheets and deploy readiness. The subtitle describes roughly a third of it.

| | Today | Proposed |
|---|-------|----------|
| Chrome | `cnViewTitleBar_` | shared `.app-bar` |
| Breadcrumb | — | `Tools › Manage › Admin` (separator `›`, per the Manage handoff §3a) |
| Title | `Call Notes · Admin` | **Admin** |
| Subtitle | KPIs, tag taxonomy, and department/tax config | System health, storage, tag taxonomy, retention and department config. Changes take effect immediately — no redeploy. |

Keep the "no redeploy" clause. It is the one thing in the old subtitle a manager actually needs to
know before touching a control.

---

# 3 · Sub-tab structure

`Overview · System · Tags · Compliance · Config · Sheets`

**System** carries a count badge when there are findings (`problems.length`), so the tab bar itself
answers "is anything wrong" without a click. That badge is the replacement for the summary the
disclosure never had.

### Overview, reordered
Today: deploy readiness → status cards → KPIs → usage → System-details disclosure. That order is
chronological by when each panel was added.

Proposed: **status cards → KPIs → usage → deploy readiness (folded)**.

- Status cards stay on Overview — a health glance belongs on the landing pane — but become
  **links** into the System tab, scrolled to their own section.
- Deploy readiness moves to the bottom and folds to a one-line summary with its pill
  (`All clear` / `N warnings` / `N blocking`) and the CONFIG timezone. You've deployed, so a
  permanent "All clear" checklist no longer earns the top of the page; it stays one click away for
  the next release.

---

# 4 · The System tab

Order: **status cards → Needs attention → passing count → storage inventory → queue inventory →
client errors.**

### 4a. Needs attention
Each finding is stated once, with its fix and a link to where the fix happens:

```
[AREA]  Title in plain language
        One sentence on what it means for the team
        ┌ the specific evidence (names, timestamps, the alias pair)
        └
        What to do                                   Open <the place> ↗
```

**The fixes are already written.** `cnRenderHealthPanel_` names the exact Agent Alias Overrides
row to add; `cnRenderStoragePanel_` names the File → Settings → Time zone path and links the
sheet. They are simply three levels down. Promoting them is most of the value here.

Sort by severity, then by area. Render nothing when the list is empty — an empty "Needs attention"
panel is worse than none.

### 4b. Passing checks
One line: `▸ 7 checks passing` with the names inline in mono, expandable to the current per-check
detail. Nothing is removed; the all-clears simply stop competing with the warnings.

### 4c. Storage inventory
`mtRenderTable_` — `Store · Class · Status · Timezone · Retention · link`, with the Script Property
name under the store label. Retire `.cn-storage-row` / `-main` / `-role` / `-meta`.

- **Sort problem rows first.** A tz drift at row 8 of 9 is invisible.
- Keep the tz-drift fix line inline on the drifted row, with its `open ↗`.
- Keep the existing distinction: for the no-fallback-by-design stores (External, Employee Docs, QA
  — INV-122/196) `not set` is a **fact**, not a warning. That reasoning is right; the mock states
  it as a footnote so a reader doesn't chase a non-problem.

### 4d. Queue inventory — kept
Stays visible per your answer, behind its own toggle, with the deploy-readiness treatment: a
summary line and an `Open question` pill.

Give it a heading that states the question it exists to answer — *does DQE carry one row per
agent-queue-date?* — rather than "Queue inventory · discovery". Its own source comment explains
that this gates whether per-queue rep attribution is possible at all; a reader who doesn't know
that sees three tables of queue identifiers and no reason for them. When the question resolves,
this is the first thing to retire.

### 4e. Client errors
Its own folded line with a count and window. Zero is the common case and shouldn't occupy the page.

---

# 5 · The one real refactor

`cnRenderHealthPanel_` decides tone **and** emits markup in a single pass, interleaved in payload
order. That is what makes the flat run unavoidable.

Split it:

```js
// PURE — Node-pinnable, like qaPeaks_ and the other pinned helpers
cnHealthFindings_(health, storage) -> [
  { id, area, severity: 'ok'|'warn'|'fail', title, detail, fix, link }, …
]
```

Then:
- `severity !== 'ok'` renders into **Needs attention**; the rest are counted.
- **`cnSetSysFromHealth_` derives the three cards from the same array**, instead of re-deriving
  tone independently. That removes a live risk: today the cards and the panel compute status from
  the same payload by two separate code paths, so they can disagree.
- Worth a test asserting every findings id lands in exactly one of the two buckets — the same
  discipline as the existing pure-helper pins.

**Keep the CDR toning rule.** The card tones off `likelyMismatches`, never raw `unmatchedAgents`,
because the CDR feed covers the whole phone system while the roster is one team — a card that can
never go green trains the reader to ignore it. `rosterWithNoCdr` fails the same way. That comment
is one of the better pieces of reasoning in the file and must survive the refactor.

---

# 6 · Do not break these
- **Contained failure per panel.** The C17 batch-2 fix exists because `errorStateHtml_` into `area`
  destroyed all five panes and the slots six in-flight loaders were targeting. A sixth pane means
  a sixth slot to keep intact.
- **`currentView !== 'callNotesAdmin'`** guard on every success and failure handler.
- **Failed ≠ absent** (E7 / F16). A panel that can't load says so; it never renders blank. This was
  fixed twice and the second time was on the surface configuring two irreversible PHI purges.
- **The M-8 re-enter fix applies directly to the new System tab.** Persist it in
  `CN_STATE.adminTab`, and make the *enter* path perform the same empty-pane load the click path
  does — otherwise a manager who leaves Admin on `adminTab === 'system'` returns to an
  active-highlighted tab over an empty pane, recoverable only by clicking the already-active tab.
  That is the exact bug that shipped for Sheets.
- **`esc()`** on every server-derived string before `innerHTML`.
- The retention editor's danger-gated saves and safety-ordering warnings are untouched.

---

# 7 · Smaller things in the same pass
- Redundant fallbacks on defined tokens — `var(--warning-deep,var(--warn))`,
  `var(--success-deep,var(--accent))` in `cnRenderDeployReadinessHtml_` and
  `cnRenderStoragePanel_`. Same family as the `--accent-deep` fix in the earlier handoff.
- `aria-controls` on every disclosure button (the current one, plus the new deploy-readiness,
  passing-checks, queue-inventory and client-error folds).
- **Six sub-tabs overflow a phone.** `.toolbar-tabs` must scroll inside itself rather than push the
  page sideways — the V-6 25px-overflow fix at 390px.
- `cnQueueInventoryHtml_` uses `--muted-3` for unpopulated transfer columns. That one is genuinely
  decoration and can stay.

# 8 · Accessibility
- The System tab badge needs a text equivalent — `aria-label="System, 2 findings"` — since a
  count bubble is colour-and-number only.
- Status cards become links: real `<button>` or `<a>`, with an accessible name that includes the
  status ("Automation: 2 sync failures — open System").
- Findings are a list, not a run of divs; severity is carried in words, never colour alone.
- Storage table: `aria-sort` on the sorted column, and the pills keep their text labels.

# 9 · Visual coverage
Add to `test/visual/shoot.mjs`: `admin-overview-light-wide`, `admin-overview-dark-wide`,
`admin-system-light-wide`, `admin-system-dark-wide`, and an `admin-system-allclear-light-wide` —
the healthy state is the one that changes most under this design and the one a fixture full of
problems will never show.


---

# Addendum — reviewed against the repo, 2026-09-01

**The System tab owes a mobile visual scenario the day it lands.** The 2026-09-01 Admin sub-tab
round added **VIS-ADMIN**, a pin that derives the Admin pane set from the client's own
`tab('key','Label')` call sites (INV-179) and requires a mobile scenario per pane — written
explicitly so that "a sixth pane owes one the day it lands." The System tab is that sixth pane.
Ship `admin-system-light-mobile` with it or CI fails.

Take the pin seriously rather than working around it: its first run found a live defect by exactly
this route — at ≤720px one rule stacked `.cn-tax-head` and `.cn-tax-row` together, so the
tag-taxonomy header rendered as six column labels stacked above the first row, aligned with
nothing, with a usage bar drawn over the word "Usage." The five Admin panes now have mobile
scenarios (matrix 62 → 67) and a `getAdminSheetView` fixture the Sheets pane never had.

**The tab-strip affordance is now formally your call.** The same round recorded: *"The Admin
sub-tab strip scrolls internally at 390px with no visual affordance that it does. Reaching 'Sheets'
on a phone requires discovering the horizontal scroll. Not fixed here — it is an operator design
call, not a structural defect."* A sixth tab makes it worse. Cheap fix: a scroll-shadow or chevron.
Honest fix: a two-row wrap or an overflow menu. This is the C5 finding from `HANDOFF.md`, arriving
back as a question.

**Counts:** matrix 67, pure 712, DOM 101, `runAllTests()` 305.

Everything else in this document still holds — `cnRenderHealthPanel_`, `cnSetSysFromHealth_`,
`cnRenderStoragePanel_`, `cnQueueInventoryHtml_` and the disclosure are unchanged by that round,
which was coverage work plus one CSS fix scoped to `.cn-tax-*`.
