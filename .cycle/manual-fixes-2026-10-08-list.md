# CSR Procedures Manual — change list (2026-10-08)

From a review of `manual/` in team-tools at commit `b6a3c90` (after October update Phases 1–7). The review built everything from the repo: `make_all.sh`, `make_packets.sh`, `export_reference.py`, the app tests (222 pass) and the visual harness. It also screenshotted the HTML manual, the Word and PDF output and the Reference reader.

**Tags**
- **FIX**: verified against the repo; still wrong as of `b6a3c90`.
- **CHECK**: probably wrong, but the October update changed a lot of structure (renumber, recolour, moves, folds). Verify first, fix only if it's still wrong, and report what you found.
- **DECIDE**: Robin's call. Don't change; ask.

**Root cause of Part A.** The repo's `manual/` was seeded on 2026-09-28 (commit `00122ec`) from a copy made a few hours before the approved bundle. A few approved fixes never reached the repo. The review-packet generator and spec are also the pre-trim versions.

---

## Handoff block (paste into the Code session, with the zip attached)

```text
Task: apply the attached manual change list (manual-fixes-2026-10-08.zip → CHANGE-LIST.md).
Unzip it OUTSIDE manual/ (e.g. /tmp/manual-fixes); only the files the steps name go into the repo.

Ground rules
- The October 2026 update (Phases 1–7: Chapters, the renumber, chapter colours/icons, moves and
  folds) is intentional. If an item conflicts with that structure, the October structure wins:
  report the conflict, don't revert.
- FIX = verified, apply it. CHECK = verify first; fix only if still wrong; report what you found.
  DECIDE = don't change; ask me.
- I keep a separate list of content changes. Don't apply Part F items that conflict with it;
  ask if unsure.
- Keep every check green: make_all.sh, make_packets.sh, npm test, export_reference.py.
  export_reference.py reads BUILT from build.py with a regex. Keep that working (A1).
- Small commits, one topic each; record decisions in STATE as usual.

Order
1. Review packets (Part B). They matter most.
   a) Copy the CURRENT manual/packets/spec.json to manual/packets/spec-october-full.json (keep it).
   b) Compile the candidate list (B3): start from packets/CANDIDATES.md in the zip, re-check it
      against spec-october-full.json and the current manual, add anything missing, drop anything
      the approved set already covers. Show it to me per packet as a table (Add / Skip / Reword),
      with the header reader changes, plus the 11 approved questions marked _check with old vs
      proposed wording. Then WAIT for my decisions on both.
   c) While waiting: rebuild the generator to the approved format (B1) and load the 96 approved
      questions (B2). Build once without any candidates and send me one packet to confirm the format.
   d) After my decisions: add the approved candidates and reworded summaries, rebuild all
      packets (B4), and send me the Word packets.
2. Part A (lost fixes), then Part C (Word/PDF), Part D (HTML), Part E (app), then Part F (content
   CHECKs; list what you'd change and ask before applying anything not marked FIX).
3. Finish: make_all.sh, make_packets.sh, npm test, export_reference.py; summarise what changed,
   what you skipped and why, and the open DECIDE items.
```

---

## Part B — Review packets (do first)

The packets were rebuilt from the pre-trim spec and generator. Today they total about 260 questions across 10 packets, with the old layout. The approved set is **96 questions in the simplified format** (per-packet counts in the table below). Rebuild to that, then add only the new questions Robin approves.

### B1 FIX — Generator: back to the approved format

The target look is `packets/approved-output-reference/` (Markdown and Word).

Start from `packets/approved-generator/` (`make_review_packets.py`, `packet_model.py`, `render_packet.js`, `packet_diagrams.py`, `make_packets.sh`). **Port** these features from the current repo generator:
- Chapter keys and names: `NAMES` → `Review-Packet-C<N>-<Name>`; "Chapter", not "Part".
- The current `FAQ` map. Sales (p4) and After Hours (p9) have no FAQ.
- The `roster` row type (`directory_rows()`), which shows a team's B.1 rows.
- The `denials` key, used only if Robin approves that packet.
- `sec` is optional; bold is stripped inside `q`.

Ignore spec keys starting with `_`.

Approved format:
- **Header:** the title, then "For:" and, where used, "Also for:" (◆ marks those questions). Nothing else: no "Read alongside", no "Section numbers refer…" line.
- **Body:** one continuous numbered list per packet.
  - No "How to answer" section, no group headings ("Changed in the September 2026 revision…", "Added in the October 2026 update…" etc.), no "Why we're asking" lines.
  - No closing thank-you line.
- **Each item:** the question or statement, then its "From the manual — N.N Title" excerpt(s), then an answer box with ☐ Correct ☐ Needs change and Notes. The box can't split across pages and stays with its question.
- **Word:** Arial; footer is the page number only; no running header.
- **Placeholders:** `[PENDING: …]` prints as "[Links to be added]"; figure placeholders are dropped.
- **Tables:** `~filter` on a sec token shows only the matching table rows.
- **Diagrams:** shown as images where `"diagrams": true`, via `packet_diagrams.py`. That covers Power C5 Q1 (Power Order Process), Sales C4 Q5 (Power Order Process) and Oxygen C8 Q2 (troubleshooting flowchart). Images are captured at the diagram's viewBox width so wide diagrams aren't squashed.

### B2 FIX — Spec: the 96 approved questions, renumbered

Replace `manual/packets/spec.json` with `packets/spec-approved-renumbered.json`, keeping a copy of the current file first (handoff step 1a). What changed in it:
- Chapter keys follow the chapters: p4 = Sales, p5 = Power … p9 = After Hours.
- Every `sec` token is renumbered through `data/renumber-2026-10.json` and the Phase 3 moves; `_approved_sec` keeps the approved number.
- "Part N's resource list" now reads "Chapter N's resource list", and the Billing title is "Billing & Denials".

Per-packet counts: C2 8 · C3 11 · C4 Sales 11 · C5 Power 11 · C6 Field Ops 14 · C7 Service 15 · C8 Oxygen 6 · C9 After Hours 5 · C10 Billing 15.

Verify every `sec` lands on the intended section (compare titles), and that every `~filter` still matches a table row.

**Eleven rows carry `_check`.** The October text overtook their summary line, so draft new wording from the current manual and show Robin old vs new before changing:

| Packet · Q | What changed in October |
|---|---|
| C2 · 5 | Walkers: out of state is OOR on **insurance** orders only (2.2.1) |
| C2 · 6 | Knee walkers: 2.6.1 was deleted; the Homelink rule is in 10.10 (sec updated) |
| C3 · 2 | The 3-month cap moved to 3.3.2 and now covers all supplies (sec updated) |
| C3 · 6 | E0471 billing class is under review (see F1). Keep, reword or drop |
| C3 · 9 | Category owners are now role links with backups (3.3, 3.3.1) |
| C5 · 7 | "MA is primary, not secondary" moved to Billing 10.7 (sec updated). Does it still belong in the Power packet? |
| C6 · 5 | A PMD **can** go to a nursing home that is the patient's permanent residence (6.4.4) |
| C7 · 1 | The "no trip charge during a repair" rule was deleted |
| C7 · 2 | The diagnostic-fee conditions changed (7.3.2) |
| C7 · 12 | The competitor referrals were removed; 7.14 now says suggest a local DME repair service |
| C10 · 13 | The knowledge check left the manual (`manual/training/`). Drop, or retarget |

### B3 DECIDE — Candidate new questions

`packets/CANDIDATES.md` lists the **64 questions** in the current repo spec that aren't in the approved set, per packet. Most come from "Added in the October 2026 update", plus three October rewrites and the new Denials packet. It also covers the **header reader changes**:
- Power adds Rajdeep Thakar and Parth Shah.
- Service adds Parth Shah.
- Billing re-added the three supervisors, whom Robin had removed. Keep them removed unless he says otherwise.

Per packet: C2 5 · C3 9 · C4 2 · C5 9 · C6 10 · C7 5 · C8 0 · C9 3 · C10 13 · Denials 8 (whole packet).

Re-check the list against the repo at run time, then present it as tables with Add / Skip / Reword, and wait.
- Several candidates appear in more than one packet (very high coinsurance, swap-outs, POCs, phone-first, 4.5.1, write-offs). Robin may keep a question in one packet only.
- Add the approved candidates at the end of each packet's list, before the closing "Resources" and "Anything else?" questions.

### B4 FIX — Build and check

- Run `make_packets.sh`.
- Confirm the counts equal 96 plus the approved candidates, and that nothing is reported MISSING.
- Open the Word files; check the diagrams show; compare against the reference.
- Send Robin the packets.

---

## Part A — Fixes lost from the approved version

**A1 FIX — Build date stuck at 09/15/2026.** It's hard-coded in `build.py` (`BUILT = "09/15/2026"`) and `make_html.py` (`BUILT = …` and the sidebar `built 09/15/2026`). It shows in the HTML sidebar, the Word guides and the Reference import. The approved version used today's date at build time. `export_reference.py` reads `BUILT` from `build.py` with the regex `^BUILT = "([^"]+)"`, so if BUILT becomes an expression, change the export to import it (or keep it working another way). Keep the export deterministic for unchanged source: a date-only change shouldn't make a re-import rewrite every article. Check how `built` is used before choosing.

**A2 FIX — Oxygen accessory notes (8 records in `data/equipment.json`, shown in 8.4).** Replace "Included in the monthly oxygen rental payment during the 36-month period — no separate charge to the patient." with "Included in the oxygen rental — no separate charge to the patient at any point in the 5-year useful lifetime." The current wording contradicts 8.4.1 and 10.12.2.

**A3 FIX — 0.2.1 lead callers lost the manual wheelchair path.** It should read "…usually for a power mobility device, PAP or a manual wheelchair — … — the Sales Q for power mobility, the PAP Q for PAP, the Sales MWC Q for manual wheelchairs. See [[§4-5]]." The queue still exists (router 1.1, 4.1, the Sales Manager's row).

**A4 FIX — "rota" → "rotation".** In the 9.1.2 heading, the 9.x "Weekly rota documented" row, and the roster note on the oxygen-only technician.

**A5 CHECK — 3.12.2 / 3.12.3.** The approved version had an HCPCS column in 3.12.2 and **no** 3.12.3 item table (the `{{flag:compliance…}}` table was removed). In the repo, 3.12.3 is back and the HCPCS column is gone. October Phase 3c then rebuilt 3.12.2 with an "If not met" column. Ask Robin whether to add HCPCS to the current table and drop 3.12.3.

**A6 DECIDE — Printable PDF.** The approved edition (`optional/make_pdf.py`, made from the HTML) had a cover, a contents page and PDF bookmarks. The current PDF comes from the Word file and has none of these. Options:
- Restore `make_pdf.py` alongside the Word PDF. It was written for the 09/28 HTML; check its print CSS and the "Part" wording against the October HTML.
- Give the Word manual a cover and a contents field.
- Leave as is.

---

## Part C — Word and PDF (the print copy)

Seen on the LibreOffice PDF of `CSR-Procedures-Manual-v3.0.docx` (221 pages). **Confirm each in Word itself before fixing**, since some may be LibreOffice-only.

**C1 FIX — Equipment photos are clipped to a thin top strip,** solid black bars on the power chair pages. This affects every equipment table, in the manual (e.g. pp. 8, 39–46, 50–57, 61, 78–80, 108–109) and the department guides. Likely an exact line height on the image paragraph in the table cell; use single or at-least spacing.

**C2 FIX — Numbered lists never restart.** They keep counting across the manual (0.5 prints "10.", "11."; it reaches 32 by p. 130). Two-digit numbers also lose their gap ("11.Offer…"). Give each list its own numbering instance, or a restart.

**C3 FIX — Callout leads start lowercase in Word only** (141 of 238, e.g. "no sales tax unless stated", "the CSR team handles…"). Capitalise the first letter after the label is split off. The HTML is correct.

**C4 FIX — Page breaks.**
- Set keep-with-next on headings and callout labels (labels are stranded on pp. 32, 66, 100, 106, 125; heading 9.7 on p. 126).
- Don't let table rows break across pages (e.g. 1.2 on p. 25).

**C5 FIX — Column widths.** The B.1 directory has four equal columns, so emails break mid-word. Make "How to reach" about 40% and narrow "Backup". Weight the changelog "Change" column and the equipment "Notes" column by content.

**C6 FIX — Raw markup in the text.**
- `**…**` on pp. 52 and 124.
- A stray double backtick on p. 16; single backticks on p. 27.
- `_…_` in the changelog and index intros (pp. 179, 198).

**C7 FIX — Footer:** "Page" is smaller than the page numbers. The packets' footer does the same, until B1 replaces it.

**C8 DECIDE — Diagrams print with about 5-point text** (pp. 4, 15, 17, 31, 89, 98, 113). Options: landscape pages for the wide ones, or accept.

---

## Part D — HTML manual

**D1 FIX — Phones and tablets (≤900 px) get a 280 px text column.** This is in both old and new builds. `@media (max-width:1240px){.wrap{grid-template-columns:280px minmax(0,1fr)}}` comes after the ≤900 px single-column rule and wins. Limit it to `(min-width:901px) and (max-width:1240px)`. Also: "☰ Contents & search" opens the nav at the very top of the document. Make the open nav `position:fixed` with its own scroll.

**D2 FIX — Headings land under the sticky breadcrumb bar** after a search, sidebar, cross-reference or router jump (both builds). Set `scroll-margin-top` to about 64 px on targets (h1–h3 and `tr[id]`), and about 110 px at ≤900 px.

**D3 CHECK — Search by old section number.** Confirm the intended behaviour first, then fix:
- "formerly 9.4" finds nothing: the number match compares the whole query to single words.
- Plain "9.4" / "§9-4" opens the old section (now 4.5) ahead of the current 9.4, with no label saying why.
- "part 5" now finds nothing.

Suggested: current numbers rank first, then old numbers with a small "formerly 9.4" chip; "part N" maps to the renamed chapter with a note.

**D4 CHECK — 5.1.1 phase colour key.** The swatches use `var(--p4)`, `var(--p9)`, `var(--p7)`, `var(--p5)`; the Power diagram colours the same phases `--p5`, `--p4`, `--p8`, `--p6`. This may be intended after the recolour. Confirm each swatch matches its phase in the diagram, in light and dark.

**D5 CHECK — Landing on a directory row (role links).** The row sits under the sticky bar (D2), and the breadcrumb, sidebar and "On this page" still show the section you came from. Update the current-section state on `hashchange` to the nearest heading above the target.

**D6 FIX — Printing from a dark-mode computer** prints light text on a dark page (both builds). The print `:root` colours lose to `:root:not([data-theme="light"])`. Restrict the dark media query to `screen`.

**D7 DECIDE — Ctrl+P prints only the cards** (by design). Should there be a "Print this section" button (and a "Print cards" button), so a CSR can print the procedure they're reading?

**D8 FIX — "What did the caller say?" dialog.** Keep Tab inside it, set `aria-modal="true"`, and return focus to the button on close.

**D9 FIX — UI wording vs the real screen.** The Messages button is **bottom left** (Robin's Transaction Work Flow screenshot). Fix the three places that say "bottom right": the 0.10 note, the 0.10.5 Notes row, and 0.11.1.

**D10 Polish:**
- Wide tables on phones need a scroll hint (right-edge fade).
- The index filter needs a "no matches" line.
- The router answer names a second section as plain text (link it) and has a stray space before the comma.
- In dark mode, the 1.2 table's Because/Where header is a bright band.
- CHECK: "Chapter 10" appears twice in the sidebar (Billing & Denials, Billing reference). Is that intended?

---

## Part E — Team Tools app

**E1 CHECK — The visual harness's manual fixtures** (`test/visual/mock.js`, `manualSection()`) are pre-renumber, e.g. "0.11.2 What the equipment looks like" and router "5.2 if it's scheduled". The reader screenshots therefore don't show the real manual. Consider refreshing them from a real `manual.json`.

**E2 FIX after the above:** run `export_reference.py`, import as drafts, and spot-check the reader: a chapter page, a diagram in dark mode, a cross-reference preview, the router, and section-number search.

---

## Part F — Content findings from the 10/08 review (CHECK; may overlap Robin's own list)

These came from a chapter-by-chapter review. Robin has a separate list of content changes, so treat every item as **CHECK**. Skip anything that conflicts with his list, and ask before applying. Items marked *Billing* go to the Billing packet rather than into the text.

**F1 — Billing classes.**
- E0471 is a capped rental under Medicare (CMS moved it in April 2006), not a "continuous rental, never owned". It's wrong in 3.7.2, 7.3.1, 10.2, 10.A, Card 10, the FSS glossary entry, the rental-timeline diagram and `equipment.json` (two BiPAP ST records).
- Oxygen cylinders (E0431) are listed as capped rental in 10.2.1; they belong under the 36-month oxygen rule.
- The rental-timeline diagram says "fee every 6 months" for oxygen servicing after month 36, which contradicts 10.12.2. *Billing* to confirm.

**F2 — K3 Guardian 20" note.** It says "K0003 with E2201 for a patient over 250 lbs". K0003 tops out at 250 lbs, so over 250 lbs is K0006. E2201 covers seat widths from 20" up to, but not including, 24".

**F3 — 7.3.2 diagnostic visit.** It no longer says the visit is free when the technician finds and repairs a fault. 1.1 and Card 7 also word the two conditions differently from 7.3.2.

**F4 — 3.3.2 lost "Texas Medicaid ships one month at a time; check eligibility before each shipment".** 3.8.1 still points there for it, and the 3.3.2 note links to 6.8.1, which covers Medicare only.

**F5 — Chapter 9 "Oxygen tank requests after hours… see [[§8-3.3]]".** 8.3.3 no longer covers tank requests, and 9.3 sends supplies to business hours. Say what happens, or remove the line.

**F6 — "Notify an RT" links** in 3.1, 3.10 and Chapter 7 resolve to the Respiratory Therapists row (Parth Shah, backup Shagun Shastri). Point them at the On-Call Respiratory Therapist role, or give RTs their own row.

**F7 — Power scheduling.**
- The Power diagram's ATP box says "Field Ops schedules"; it should say Field Ops-Power, with virtual ATP going to Virtual ATP Scheduling.
- The Virtual ATP Scheduling directory row routes callers to the Field Ops-Power Q.
- The PAR Standard and PAR Complex rows still use the old "Authorization Request:" email subject.
- Card 5's scheduling line has no virtual-ATP exception.

**F8 — Cards.**
- Card 0: "`Pat. Resp.` — what they owe" (and 0.10's watch-out) contradicts 10.19.1, where Pat. Resp. holds pre-delivery balances only and Edit Patient → Invoices holds billed ones.
- Card 0's Email column reads "not urgent or same-day", the opposite of 0.12.3.
- Card 1 dropped the abusive-caller warn-first rule and the "don't say you'll own the oxygen" line. Intended?
- Card 10 has no Denials routing.
- Card 3's "Overrides to Chapter 0" header uses the old name of 3.2.

**F9 — 1.6.1 "Per the supplier standards, a complaint record must include:".** Supplier standard 19 includes the Medicare number. Keep the five fields but reword the lead-in, e.g. "Our complaint record captures: … (the MBI is on the account)".

**F10 — 10.14 lost "pick-ups are created by CSRs or the Denials team; there is no separate discontinuation form or queue"** (also absent from 6.9.3).

**F11 — Directory.**
- The Spanish Queue row shows "Direct", but 1.7 and Card 1 say never transfer directly.
- Denials has no row in the 1.4.4 leads table (`lead_of` is missing).
- B.1's intro says every name is written in full, but the three resupply category owners are "Sonia S.", "Michelle B." and "Monica J.".
- Stale roster notes: the lift chair "no backup", Parth Shah's "three roles", the Menzise contact note.

**F12 — Leftovers.**
- 5.x "four points below": there are five.
- 6.6 "Three documents come out of a delivery": there are two.
- The resupply-windows diagram cites 3.3.3; the rule is now in 3.3.2.
- The PMD pick-up diagram still says "may not be able to get another"; the text now says "may have difficulty".
- The router's pick-up row → 7.6.3 (a stub); point it to 6.9.2.
- 1.3 and 10.22 link to each other in a circle.
- 10.17.1 says "an traditional".
- 3.5 says "It is 1 / 3 months."
- 3.4 says "two things worth knowing" but only one follows.
- 5.3 has a doubled T3Q role link.
- 6.x: the SNF row links 6.4.1; the SNF material is in 6.4.2.
- 6.x FAQ on nursing homes vs 6.4.4.
- The p6/p7/p8 "Open items" tables have garbled or stale rows.

**F13 — Glossary.**
- PMD, PAK, PPD, QL, F2F, ME, POV, PWC and the Payor/HCPCS sheet aren't tagged p4, so the Sales guide prints none of them.
- The "Parts" column header should say "Chapters".
- `render.py` treats "5 chapters" as "All", so SOS and RUL wrongly show All.
- MA "replaces Part B": MA replaces Parts A and B.
- CST should be "Central Time".

**F14 — Changelog and search aliases.**
- Changelog rows quote old numbers as if new ("moved from 7.9", "formerly 5.9.3", "7.14 Competitor PMD referrals removed").
- The two 7.3.2 entries on the same day disagree.
- `renumber-2026-10.json` has no "formerly 7.9" for 10.12.8 or "formerly 5.9.3" for 10.19.6, the numbers CSRs actually knew.

**F15 — *Billing* confirms.**
- "Medicaid is billed primary" for bed upgrades (Medicaid is normally payer of last resort).
- Whether the E0621 sling is a capped rental.
- 6.9.1 (a returned bed blocks a new one for 5 years) vs 10.14 (a long enough break restarts a 13-month rental).
- Whether a break of exactly 64 days in the 10.12.8 example restarts the rental.
