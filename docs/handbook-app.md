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

Only six files are written by hand:

| File | Holds |
|---|---|
| `Handbook.js` | The server's environment (who is asking, the spreadsheet, today) and its public endpoints |
| `People.js` | The Handbook spreadsheet's People tab: profiles, managers, confirmations (HB2.1) |
| `Quiz.js` | Taking a quiz: reads ManualQuizzes, records attempts and resets (HB3.2) |
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

A publish in Team Tools reaches the app within five minutes (its caches are its
own). Search synonyms reach it when Team Tools next saves them or imports the
handbook.

## Tests

- Pure (`test/client/run.js`): HB1.2-a…e, HB1.3-a…e, HB1.4-a…f, HB2.1-a…e, HB3.2-a…d — the copies,
  the refusals, the server driven in a sandbox over fake services, the page's
  pure helpers and contracts, no-undef over the assembled page.
- DOM (`test/client/dom/runDom.js`, "HB1.3/HB1.4/HB2.1/HB3.2"): the whole page booted in
  jsdom over a fake server, IndexedDB and history.
- Visual matrix: the `handbook-*` scenarios shoot `page-handbook.html`
  (`test/visual/build.mjs` writes it); three ride the CI gate.
