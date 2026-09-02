# Handoff: UMS Team Tools — Intake emails

## Overview
A design pass over all three intake emails, driven by what the receiving team actually does with
them: **they read each field and type it into the CRM.**

**Targets:** the PMD / PAP / PPD email builders (server-side `Code.js` — `intakeEmailShell_`,
`intakeBuildPpdBodyHtml_` and the account-form builders; not present in this repo).
**Reference:** `Intake Emails Redesign.dc.html` (sections 01–03).
**Supersedes:** the Intake half of `docs/design_handoff_team_tools_redesign_update/Email Templates.dc.html`.

Email-safe throughout: table layout, all styles inline, literal hex, system fonts, ≤600px,
no `var()`, no flex/grid. Same constraints the existing template documents.

**This is presentation only.** No field is reordered, merged, dropped or added; no payload,
layout constant or server contract changes.

## Decisions taken from you
| Question | Answer |
|---|---|
| Lead with the recipient's next action? | **No — keep the form's order** |
| PPD: recommendation before questionnaire? | **No — questionnaire stays first** |
| What the recipient does | **"Input the form responses into our CRM and update the relevant order"** |
| Empty fields | *skipped* — my call: distinguish, minimally (§4) |
| Extras (Spanish flag, amended banner, feedback button, PHI line, print, images) | **None selected** — all left out |

---

# 1 · The reframe

I opened this assuming the recipient was triaging — deciding what to do next. They aren't. They're
transcribing. That single fact settles most of the design, and it invalidates the instincts a
redesign reaches for first:

**Ruled out by the job:** an action summary at the top; promoting the scheduling/permission block;
recommendation-before-questionnaire; hiding empty rows; any regrouping of fields. Every one of
these makes a transcriber hunt for a field that used to be where they expected it. Your two
"keep the order" answers were correct and are load-bearing for everything below.

**What matters instead:** not losing your place mid-column; reading a member ID without
transposing a digit; knowing whether a blank means "leave the CRM field empty" or "go chase it";
getting a value cleanly onto the clipboard.

## The four defects — all transcription defects
1. **The label outweighs the value.** Labels are bold navy, values plain. When you read to retype,
   the value is the payload and the label is the index. Backwards.
2. **Identifiers are proportional.** SSN, member IDs, DOB, phone, fax all in Arial, where a
   transposed or doubled digit is invisible. These are exactly the fields where an error is
   expensive and silent.
3. **Attestations break the column.** PMD index 24 is a 40-word sentence in the label cell with a
   one-word answer beside it. Mid-form it stops the eye and knocks the value column off rhythm.
4. **Three kinds of blank look identical.** SSN is a fallback for missing insurance; PMD discharge
   date is conditional on being in a facility; PAP sleep-study details depend on the prior answer.
   Not-applicable, not-asked and missing-but-needed all render the same empty cell.

Note that PMD and PAP have **never had a design pass** — they share `intakeEmailShell_` and got
the branded shell in the restyle round, nothing more. PPD got one, but it predates the
questionnaire treatment here.

---

# 2 · The four rules

Applied identically to all three emails.

### 2a. The value leads
- Label `12px #737c8c` regular. Value `13.5px #0f1623` bold (`14px` for the patient name).
- Label column pinned with `width="46%"` on the **first row of each table** so the value column
  starts at the same x on every row — the eye runs straight down it. Both cells are
  `vertical-align:top` and labels get `line-height:1.4`, so a label that wraps never moves its
  value. **Tune against the verbatim bank strings, not paraphrases** — the longest EN labels
  ("If so please provide Sleep Study details (approx. date & provider details)",
  "Permission to call & schedule Mobility Evaluation with MDO?") wrap to two lines at 12px, and
  the ES equivalents are longer again.
- **Three separators, not one.** Zebra `#ffffff` / `#eef3f9`; a `1px solid #dce0e7` row rule; and a
  `border-right:1px solid #dce0e7` on the label cell. Losing your place mid-transcription is the
  specific failure all three prevent.
- The zebra tint is deliberately a real step, not a hint — `#eef3f9` is navy-tinted and survives a
  printout and a dim monitor. A 2% tint (`#f8fafc`) reads as flat white and buys nothing.
- **The vertical column rule does the most work.** It turns a list of label/value pairs into a
  label ledger and a value ledger, so the eye tracks one column down the page without re-finding
  it on every line. Labels darken to `#5f6d80` — still clearly subordinate to the `#0f1623`
  values, but readable at a glance rather than squinted at.
- Section headers keep the existing navy bar (`#223b5d`, white, uppercase, 1.2px tracking).

### 2b. Identifiers are monospaced
`font-family:'Courier New', Courier, monospace` — the one mono stack that renders across Outlook,
Gmail and Apple Mail.

Applied to: phone, secondary phone, MDO phone, MDO fax, DOB, SSN, insurance member IDs, height,
weight, and the HCPCS codes. `letter-spacing:.03em`, `.06em` on member IDs.

Not applied to: names, addresses, free text, diagnoses, notes — proportional reads faster and
there's no digit-level risk.

**Insurance rows split.** Carrier stays proportional on line one; the member ID drops to its own
line beneath in mono. They go into two different CRM fields, so they shouldn't be one string.

### 2c. Attestations run full-width
The condition is **a checkbox index whose bank label is a declarative sentence rather than a
question** — today exactly **`PMD 24`** ("Explained mobility evaluation with doctor is needed…")
and **`PAP 26`** ("Informed that we will reach out to MDO…"). They render as a `colspan="2"` row:
a green `&#10004;`, **Confirmed by agent**, then the sentence at `12px #4a5464`. Nothing there
needs transcribing, so it leaves the value column entirely.

> The rest of the `checkboxes` arrays — `PMD 22`, `PMD 25`, `PAP 24` — are ordinary yes/no
> **questions** ("Already had a Power Mobility Evaluation in last 6 months?",
> "Permission to call & schedule Mobility Evaluation with MDO?", "Have you done a Sleep Study in
> the past?"). They keep their answer in the value column. Treating the whole array as
> attestations would silently drop three answers, one of them the permission Sales acts on.

> A **false** value renders the same row in `#8a4500` reading **Not confirmed**. It must never
> just disappear — an unconfirmed consent is more important than a confirmed one.

### 2d. Two kinds of blank
You skipped this, so: distinguish them, minimally.

| State | Renders | Transcriber does |
|-------|---------|------------------|
| Asked, left empty | `— not provided` | leaves the CRM field empty |
| Made moot by a prior answer | `Not applicable — <reason>` | skips it |

The reason is derived from the **governing answer**, never guessed: "patient at home" (PMD 20
follows PMD 19), "no prior eval" (PMD 23 follows 22), "insurance on file" (SSN follows the
insurance rows). Both states in `12px #a5acb8` — visibly lighter than any real value, so they can
never be mistaken for data.

---

# 3 · Worth checking before you build any of this

**The app already builds a CRM-paste template — for the wrong person.**

`script_intake.html` (~line 2935): on a successful intake send it builds a CRM-paste note template
and copies it to the clipboard *for the sender* — the agent who has just finished with the patient
and is not the one doing CRM entry. The person doing that entry is the recipient, and they get a
form to retype by hand.

If that template is close to what your CRM accepts, putting the same block at the foot of the
email (or attaching it as a `.txt`) removes the transcription step that this entire redesign
otherwise just makes faster. I haven't designed it — whether it works depends on how well the CRM
takes a paste, which you'd know and I wouldn't. But it's the highest-leverage thing on this page
and it's mostly already written.

---

# 4 · Do not break these
- **Label text is the bank, verbatim.** Not shortened, not re-punctuated, not de-parenthesised.
  The banks carry EN *and* ES arrays and also feed the form UI and `intakeSentDetailHtml_`, so a
  label edit is a content change across three surfaces — out of scope for this pass.
- **Field order and section headers are the bank.** Nothing is reordered, merged or dropped. The
  server-authoritative `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` are unchanged.
- **The client/server layout coupling stays pinned.** `INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`
  mirror the server and `test_intake_layoutCoupling` must keep passing. **Do not key the attestation styling off the whole
  `checkboxes` array** (see 2c) — it holds ordinary questions too. Key off the two named indices
  or the sentence-vs-question test, and pin whichever you choose.
- **Both language banks.** Spanish labels are materially longer. The 42% label column must hold
  them without shifting the value column. Check PMD index 24 and the PAP consent line in ES.
- **Email-safe:** tables, inline styles, literal hex, no `var()`, no web fonts, ≤600px, badges as
  `inline-block` spans.
- **`esc()`** on every rendered value; PPD's `payload.rows` render verbatim (INV-89).

# 5 · The existing design doc is now behind the product
`docs/design_handoff_team_tools_redesign_update/Email Templates.dc.html` shows neither of two
shipped features, and someone will eventually build from it:

- **Send feedback** (added 2026-08-13) — the button in the email, whose replies render newest-first
  in the Sent detail.
- **AMENDED / superseded** — the code marks an amendment "clearly … to you and the recipient", and
  the Sent detail renders banners in both chain directions. The email has no designed state for
  it. This one carries real risk: a superseded copy that reads as current is a wrong-order path.

Neither was in scope for this pass. Both are worth adding to that doc even if the emails don't
otherwise change.
