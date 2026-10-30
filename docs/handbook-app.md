# The handbook app (`handbook-app/`)

The Policies and Procedures Handbook as its own web app, for **every employee
signed in to the company domain** — not only Team Tools' roster. It shows
exactly what Team Tools' Reference shows (the same reader, the same rules), and
it is built so it cannot drift from it. Batches HB1.1–HB1.4 and HB2.1 (operator
2026-10-28/29); the reasoning is in [`design-decisions.md`](design-decisions.md)
under the "handbook app" entries.

## What a reader gets

- **Home** — the version, *what changed since your last visit* (published
  sections only; a first visit shows the last 30 days), your department's
  chapter first (chosen in the header, remembered in that browser), then every
  chapter.
- **Contents** on the left (a **Contents** button on a phone), with a dot on any
  section changed since the last visit.
- **The reader** — Team Tools' own: chapter mastheads, the reader bar, quick
  cards, slideshows, diagrams, cross-references, printing.
- **Search** in the header — a section number (`6.9.3`, `card 4`) jumps
  straight to it; anything else lists the matching sections. Back returns to
  the results.
- **Section links** — `<app URL>?s=6.9.3` opens 6.9.3. Every section opened
  updates the address bar, and Back / Forward work.
- **Feedback** in the reader bar — helpful / not helpful, and *Suggest an edit*.
- **Profile** in the header (HB2.1) — the reader's department and manager. A
  first visit is asked for both on the home page; the manager confirms. A
  manager sees *Your team* there; the admin also sees the managers and
  everyone. See [People](#people).
- The chapters are **kept in the browser** and re-read only when the handbook
  changed; if the server cannot be reached, the kept copy is shown with a note
  that it may be out of date.

## How it is built

Only seven files are written by hand:

| File | Holds |
|---|---|
| `Handbook.js` | The server's environment (who is asking, the spreadsheet, today) and its public endpoints |
| `People.js` | The Handbook spreadsheet's People tab: profiles, managers, confirmations (HB2.1) |
| `Quiz.js` | Taking a quiz: reads ManualQuizzes, records attempts and resets (HB3.2) |
| `Training.js` | Training plans, team quizzes and read marks (HB3.3) |
| `index.html` | The page template |
| `script_handbook.html` | The page: the reader's host (all 18 `MANUAL_HOST` hooks), contents, home, search, the people view, the browser copy, links |
| `styles_handbook.html` | The frame's styles |

Everything else is a **copy** that `npm run handbook:sync`
(`scripts/handbook-sync.mjs`) writes from `web-app/`:

- `kb_shared.js` — Team Tools' handbook readers (chapters, images, meta, what's
  new, search, the feedback check, the search-signal plan), copied verbatim by
  a scope-analysed dependency walk. The walk stops at every name the app
  declares itself and **refuses** a copied write, a reach into `CONFIG`, or a
  `ttXxx_` name with no original.
- `shell_shared.html` — Team Tools' page shell (overlays, toasts, copy,
  printing, the suggest dialog), walked the same way; it refuses a reach into
  Reference's state and a call to a server function this app does not serve.
- The reader partial, the diagrams, the icons and both style partials, byte
  for byte.

**Never edit a copy.** Edit `web-app/`, run `npm run handbook:sync`, commit
both. CI runs `node scripts/handbook-sync.mjs --check` and fails while a copy is
stale.

## What it reads and writes

It runs as the deployer, so readers need no access to the spreadsheet. It reads
the KB spreadsheet named by its `HANDBOOK_KB_SS_ID` Script Property (the same
spreadsheet as Team Tools' `KB_SS_ID`): the KB tab (published `man-…` sections
only — nobody is an admin here), ManualMeta, ManualImages, KbImages, OopPricing
(for search's HCPCS vocabulary) and **KbSearchConfig**.

It **writes** by `appendRow` only — an atomic append, because the two
projects' ScriptLocks do not exclude each other:

| Tab | What | Who reads it |
|---|---|---|
| `KbFeedback` | A reader's vote, out-of-date flag or suggested edit: `[time, section, '', reader's address, kind, note]` — checked by Team Tools' own `kbFeedbackEntry_` | Admin → Reference → Handbook → Export feedback (the worklist by source file) |
| `KbSearchSignalHb` | The vocabulary terms its searches contained — no person, once per person per term per window (Team Tools' plan) | Admin → Reference's search signal, beside `KbSearchSignal`; the nightly purge keeps 90 days of both |

**KbSearchConfig** is Team Tools' mirror of two settings that live in its
Script Properties, which this project cannot read: the search synonyms and the
auto-tag rules (the signal's vocabulary). Team Tools rewrites it when either is
saved and on every handbook import — only when it changed — and says so if it
could not.

## People

Since HB2.1 the app has its own store, the **Handbook spreadsheet** named by
the `HANDBOOK_SS_ID` Script Property. Employee records stay out of the
Knowledge Base, and only this app writes it — so, unlike the KB, its rows are
updated in place, each write holding this project's lock.

Its `People` tab (created by the first save; never edit the header row) has
one row per person: `Email`, `Department` (a chapter of the handbook),
`Manager` (an address), `Role` (`manager` or blank), `Status` (blank,
`pending`, `confirmed`, `declined`) and four times.

| Who | What they do |
|---|---|
| A reader | Picks a department and a manager on a first visit (the home page asks). A new choice asks the manager again. |
| A manager (a row the admin marks) | Sees *Your team*: confirms a request, says "not my team", or removes someone later — who is then asked to choose again. |
| The admin (`HANDBOOK_ADMIN_EMAILS`, or the deploying account while it is unset) | Adds and unmarks managers, sees everyone, confirms for anyone, removes someone who has left. A manager who is unmarked leaves their people "choose again". |

Unset, nobody is asked anything and the handbook reads as before.

## Quizzes (HB3.1 — the engine and the bank; HB3.2 — taking them)

The official quizzes are written in the repo, in `manual/data/quizzes.json`,
beside the sections they test; `manual/quizzes.py` fails the manual export on a
question whose section does not exist. `manual.json` carries them, and Team
Tools' Import stores them in the KB spreadsheet's `ManualQuizzes` tab. Both apps
grade with one engine (`quiz…_` in `web-app/80_training.js`): single-answer,
multi-select and true/false questions, each with the explanation a wrong answer
is shown and the section to go back to. The answer key never leaves a server.

**Drafts (HB3.5).** Every quiz in the bank says `"status": "draft"` or
`"published"`. A draft is checked exactly like a published quiz (a broken one
still fails the export), but only published quizzes are exported, so nothing
reaches readers until the operator approves it — approving is changing the
status, then export and import. The first two, Chapter 0 (CSR Core) and Chapter
1 (Call Handling), ten questions each at 80%, were drafted, reviewed and
published on 2026-10-30.

**Taking one (HB3.2).** **Quizzes** in the contents lists them by chapter, and a
section that has one shows a quiz bar. The questions and their options are
shuffled for each sitting; every question must be answered. The result gives
the score and, for each wrong answer, its explanation and a link to its section
— never the right option. Three failed attempts lock the quiz for 24 hours from
the last (a pass starts the count over). A reader's confirmed manager, or the
admin, can reset them from **Profile → Quiz lock-outs**. Attempts and resets go
to the Handbook spreadsheet's `QuizAttempts` and `QuizResets` tabs (created by
the first one; never edit their headers); without the Handbook spreadsheet the
quizzes can be read about but not taken.

## Training (HB3.3)

**Training** in the contents opens **My training**: every plan assigned to the
reader, who set it, its due date (and Overdue), a progress bar and its items —
a chapter or section to open and sign off (**I've read this** — HB3.4), a quiz
to take (done when passed). A manager, or the admin, also sees **Team training**: their plans
(with how many people each reaches now) and their own quizzes, with Edit,
Archive / Restore, **New plan** and **New quiz**.

- **A quiz** is written one question at a time: the type (one answer, choose all
  that apply, true or false), the question, the options one per line with `*`
  before each right one, the explanation a wrong answer is shown, and the
  section to go back to. It is graded like an official quiz — the same three
  tries then 24 hours, the same manager reset.
- **A plan** is a title, a due date, its items (sections, chapters, official
  quizzes and the author's own) and who it is for — departments and/or people.
  A manager's plan reaches only their own confirmed team (a department means
  their people in it); the admin's reaches anyone. Who it reaches is worked out
  each time it is read, so a newly confirmed team member picks it up.
- A manager's quiz is seen only by the people a plan assigns it to, its author
  and the admin.

Plans, team quizzes and read marks live in the Handbook spreadsheet's `Plans`,
`TeamQuizzes` and `ReadMarks` tabs (created on first use; never edit their
headers — a row that will not read is counted and skipped).

## Display and read aloud (HB2.3)

- **Display** in the header opens the reader's display settings: text size
  (Default, Large, Larger, Largest), line spacing (Default, Relaxed, Wide),
  **High contrast**, an **easier-reading font** (Atkinson Hyperlegible,
  downloaded only once it is chosen) and **Reduce motion** (always on anyway
  when the device asks for it). Each choice applies at once; **Reset** goes
  back to the defaults. They are kept in this browser and applied before the
  page appears, so it never flashes the old look.
- **Listen** in the bar above a section reads it aloud with the browser's own
  speech — the title, then each paragraph, list item, heading and table row,
  the one being read marked. **Pause / Resume** and **Stop**; opening anything
  else stops it. The voice and speed are chosen under Display → Read aloud.
  Any voice the browser offers may be used; some (Chrome's "Google" voices)
  speak through Google's servers — the handbook is PHI-free, so that is
  allowed. A browser with no speech shows no Listen button.

## Forms (HB4.1)

- **The list is in the repo.** `manual/data/forms.json` names the forms the
  handbook carries — today the EAA and the PT/OT Evaluation Rx — each with a
  title, a one-line summary, the PDF's name in the repo's `forms/` folder and
  the sections that offer it. `forms/` is the same folder Team Tools attaches
  to customer and provider emails (`CONFIG.CALL_NOTES.FORM_CATALOG`), so one
  copy of each PDF serves both. `manual/forms.py` fails the export on a missing
  or non-PDF file, a file over 1 MB or a section that does not exist.
- **The import stores them.** `manual.json` carries each PDF as a data URI;
  Team Tools' Import checks them again and stores them in the KB spreadsheet's
  `ManualFiles` tab, in the `ManualImages` row shape (the base64 in pieces by
  part) with the title, summary and sections on every row, rewritten only when
  a form changed. The dialog's "Forms:" line says which. Do not edit the tab.
- **The page.** **Forms** in the contents lists them, each linking to the
  published sections that name it; the bar above those sections offers
  **Open the form**. Open draws every page in a viewer with pdf.js 3.11.174,
  loaded from cdnjs only when a form is first opened, run on the page's own
  thread (the sandbox cannot start a worker from another origin) and never
  evaluating a PDF's font code. **Download** saves the PDF under its title; the
  Apps Script page's sandbox may block a download without a word, so the
  message says to open the form in the viewer if nothing arrives — **test it
  once after deploying**. A failed list, form or viewer load is said, never
  read as "no forms". Filling a form in the browser is HB4.2.

## Keyboard and screen readers (HB2.4)

- **axe on every screen.** `node shoot.mjs --axe` (test/visual) runs axe-core
  — an exact pinned version, so an upstream rule never turns CI red by itself —
  over every `handbook-*` scenario against WCAG 2.1 A and AA, writes
  `axe-report.json`, and fails on any violation or when no scenario matched.
  CI runs it in the visual-layout job after the layout gate, even when that
  gate failed. A new handbook screen is checked by adding its scenario.
- **Focus follows the reader.** A section opened from the contents, a link or
  the search lands focus on its heading (once, after it paints — scrolling past
  later never pulls focus back); a view opened by a click (home, people,
  quizzes, training, saved) lands on its heading. Back and forward leave focus
  where it was. The narrow-screen contents take focus when opened — the section
  being read, else the first entry — and give it back to the Contents button on
  Escape, a tap outside or a second press.
- **What is announced.** The reading area is not a live region (a repaint would
  be read out whole). A slideshow says "Slide 2 of 4: caption" when it steps,
  never on load; its visible counter is hidden from screen readers so it is not
  read twice. The bar's previous/next buttons are named for their visible
  label and the section they open.
- **Names.** The page title is "UMS Handbook"; the Profile button's count badge
  is drawn by the stylesheet (`data-n`), so the button's name is its visible
  word (WCAG 2.5.3). A table wider than the reader is a Tab stop named
  "Table: <first cell> (scrolls sideways)", so a keyboard can scroll it — only
  while it overflows, re-measured on resize and on a text-size change.
- **Colour.** Links and primary buttons use `--accent-ink`: in light mode the
  darker accent (`--accent-2`, which every palette defines), because the
  accent itself is 4.4:1 under white text; dark mode is unchanged. The token
  lives in Team Tools' design tokens, so Team Tools' links and modal buttons
  are the darker green too.

## Bookmarks and notes (HB2.2)

- **Bookmarks** — the star on the reader bar. They belong to the reader's
  account, so they follow them to any computer; **Saved** in the contents lists
  them (Open, Remove; one whose section has left the handbook says so). Until
  the Handbook spreadsheet is set up, the browser keeps the list instead.
- **Notes** — "Add a note" in the bar above a section opens a note for that
  section; the bar then says "Your note". A note is kept **in this browser**.
  Saved lists the notes, with **Export notes** (a file), **Copy notes** and
  **Import notes** (the newer note per section wins; anything that is not an
  export is refused).
- **Keep my notes in my account** (Saved → Notes) is off by default. Turning it
  on first warns that the notes are stored in the handbook's spreadsheet, which
  the admin can open, and that a note must never hold patient information; the
  browser's notes are then merged with the account's (the later note per
  section wins, and a deletion travels too). Turning it off removes the
  account's copies; the browser keeps its own.

Bookmarks and synced notes live in the Handbook spreadsheet's `Bookmarks` and
`Notes` tabs (created on first use; never edit their headers).

## Sign-offs, team progress and reminders (HB3.4)

- **"I've read this"** sits in the bar above every section, and on each reading
  item in My training. It is recorded with the section's VERSION (a stamp of
  its text); a chapter's version is the stamp of its sections'. The bar then
  says when it was read, with Undo. One sign-off serves every plan that names
  the section.
- **Retraining.** When a section changes and the handbook's changelog flags the
  change for retraining, a reader who signed before that day is asked again —
  "Changed since you read it — please read it again" — and the plan item goes
  back to not done until they do. A change not flagged for retraining never
  asks; the bar only adds "it has been updated since".
- **Progress** (Team training, for a manager or the admin): one row per person
  on the team — plans done and overdue, quizzes passed and locked, sections
  signed and waiting to be re-signed — with Details per plan and quiz.
  **Copy table** puts it on the clipboard for a spreadsheet; **Download CSV**
  saves a file where the browser allows it (Copy table is the reliable one).
- **Reminder emails** are built but OFF. Once on, a daily run at 8am emails each
  reader with an overdue plan — once a day at most — the plans' titles and due
  dates and a link. Turning them on is in
  [`operator-state.md`](operator-state.md#operator-the-handbook-app-hb1-2).

Sign-offs ride the `ReadMarks` tab (a fifth column, `Version`); a mark written
before HB3.4 has none and counts as signed.

## Setup and deploying

The one-time setup (create the project, set `HANDBOOK_KB_SS_ID`, deploy for the
domain, and since HB2.1 the Handbook spreadsheet) is in
[`operator-state.md`](operator-state.md#operator-the-handbook-app-hb1-2).

To ship a change: `npm run handbook:push` (it syncs, checks and pushes), then
Deploy → Manage deployments → Edit → New version. A change to the handbook
reader or its server readers ships in **both** projects — Team Tools with
`clasp push -f` and a New version as usual.

## What the reader sees when something is wrong

| Message | Meaning |
|---|---|
| "The handbook is not set up yet: the HANDBOOK_KB_SS_ID Script Property is not set." | Set it (Project Settings → Script Properties) |
| 'The "KB" tab is missing from the handbook's spreadsheet.' | The property names the wrong spreadsheet |
| "Could not reach the handbook — showing the copy kept on this device…" | The server did not answer; the browser's copy is shown |
| "Section 9.9 is not in the handbook — here is the home page." | A link to a section that does not exist (or is still a draft) |
| "The search failed: …" | The search did not run — never read as "no matches" |
| "Profiles are not set up yet …" (Profile) | `HANDBOOK_SS_ID` is not set — an admin is told so by name |
| "Could not load your profile: Could not open the Handbook spreadsheet …" | The property names a spreadsheet the deploying account cannot open |
| '…the "People" tab's header row has been edited…' | Put the header row back as the message lists it |
| "Not saved: …" (a toast) | A profile or team action was refused, and why |
| "The forms could not be loaded: The form library could not be read …" (Forms) | The `ManualFiles` tab's header row was edited — re-import the handbook to rewrite it |
| "That form is not in the library — it may have been removed at the last import." | The form was dropped from `manual/data/forms.json`; reload the page |
| "The viewer could not load in this browser. Use Download …" | pdf.js could not be fetched from cdnjs (blocked or offline); Download still works |
| "Downloading … If nothing arrives, this browser blocked it …" | The sandbox may block the download without a word — open the form in the viewer |

A publish in Team Tools reaches the app within five minutes (its caches are its
own). Search synonyms reach it when Team Tools next saves them or imports the
handbook.

## Tests

- Pure (`test/client/run.js`): HB1.2-a…e, HB1.3-a…e, HB1.4-a…f, HB2.1-a…e, HB3.2-a…d, HB3.3-a…d, HB2.4-a…c, HB4.1-a…f — the copies,
  the refusals, the server driven in a sandbox over fake services, the page's
  pure helpers and contracts, no-undef over the assembled page.
- DOM (`test/client/dom/runDom.js`, "HB1.3/HB1.4/HB2.1/HB3.2/HB3.3/HB2.4/HB4.1"): the whole page booted in
  jsdom over a fake server, IndexedDB and history.
- Visual matrix: the `handbook-*` scenarios shoot `page-handbook.html`
  (`test/visual/build.mjs` writes it); three ride the CI gate, and every one
  is checked by axe (`--axe`, HB2.4).
