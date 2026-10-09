# Manual fixes, 2026-10-08: plan and decisions

This is a plan only. Nothing has been changed in the repo.

I checked every item in the change list against the current repo (HEAD 5cc6141, after PR #290). The reviewer was accurate on almost everything. The exceptions are noted inline.

- **Part 1** is the work plan, in order.
- **Part 2** lists the decisions I need from you. Mark them and send them back.

**Your decisions so far (2026-10-08):**
- **2.1 Header readers:** agreed as recommended.
- **2.2 The 11 rewordings:** drafted into the packets for you to review in the sample build.
- **2.3 Candidates:** yes, as recommended.
- **2.4:** explained below in plainer terms; still open.
- **2.5 F1:** checked against current CMS rules. Results are in the F1 rows below.
- **2.5 F8:** add the abusive-caller "warn once" rule back. It goes on Card 1, and stays in 1.x.

Step 1 (P1) has started.

---

## Part 1: The work plan

| Batch | What | Size | Needs your decisions? |
|---|---|---|---|
| **P1** | Packet generator rebuilt to your approved format, plus your 96 approved questions. Build one sample packet for you to check the format. | M (~3 h) | No. Can start now. |
| **A** | Approved fixes lost before the repo was seeded (A1–A4). | S (~1.5 h) | A5 only |
| **F1** | Content fixes that are plain errors: typos, stale notes, wrong links, leftovers (list in 2.6). | M (~3 h) | No |
| **P2** | Add the candidate questions and rewordings you approve, rebuild every packet (Word + Markdown), check, and send. | M (~2.5 h) | **Yes** (2.1–2.3) |
| **C** | Word/PDF print copy: numbering restarts, capitalised callouts, page breaks, column widths, raw markup. | M (~4 h) | C8 |
| **D** | HTML manual: phone layout, headings under the sticky bar, old-number search, swatches, dark-mode printing, dialog focus. | M (~4 h) | D7, D9 |
| **F2** | Content changes that need your call or Billing's (2.5). | S–M | **Yes** |
| **E** | Refresh the app's test fixtures to the October numbering. Then you export, import as drafts and spot-check. | S (~1 h) + you | No |

**Why A and F1 go before the final packet build.** Each packet quotes the manual's current text. If the known errors are fixed first, department heads review corrected text, not text we already know is wrong. P1 doesn't depend on any of this, so it starts first.

**What I found when checking the review:**
- **Part B (packets):** confirmed.
  - All 96 approved questions land on the right current sections, and every table filter still matches.
  - The 64-candidate list is complete: every question added in October is on it.
  - The repo's generator is the pre-trim one. Merging the two is mechanical.
- **A1 (build date):** confirmed.
  - It isn't the risk the reviewer feared: a date change does not rewrite any article on re-import. Only the manual's version info updates.
  - A repo test pins how the export reads the date, so the fix updates that test too.
  - My plan: the build date becomes the date of the last change to the manual's source. It stays fixed for an unchanged source, and it is never stuck in September again.
- **Word issues.**
  - **Confirmed:** numbering never restarts (it counts to 34), 145 of 238 callouts start lowercase, rows and callout boxes can split across pages, every table has equal columns, and there is raw `**`/backtick/`_` markup from four separate causes.
  - **Probably LibreOffice-only:** the clipped photos (C1) and the small "Page" in the footer (C7). The Word XML has nothing that would cause either. I'll still harden both cheaply.
- **HTML issues:** all confirmed and measured.
  - At phone width the text column really is 280 px.
  - Headings land 34 px under the bar.
  - Searching "formerly 9.4" finds nothing.
  - The 5.1.1 colour key doesn't match the diagram (all four swatches differ).
  - Dark-mode printing prints light text on a dark page.
- **Claims that are wrong or overstated:**
  - **F8 Card 0 Email column:** it agrees with 0.12.3; it doesn't contradict it. No change.
  - **D10 "Chapter 10" twice in the sidebar:** this is intentional (Billing & Denials, then the Billing reference). At most I'd relabel the second one.
  - **F14:** the "7.14 Competitor PMD referrals removed" changelog row already uses the correct current number. The other two rows really are wrong.
  - **F15:** "a returned bed blocks a new one for 5 years" overstates the text, which says "will likely have difficulty".
- **Source only, never printed:** A4's changelog row and the F12 "Open items" tables sit in sections the build strips. I'll fix them anyway (they're tidy-ups), but no reader ever saw them.

---

## Part 2: Decisions

### 2.1 Packet header readers

| Packet | Change in the October header | My recommendation |
|---|---|---|
| C5 Power | Add **Rajdeep Thakar** (Power Manager) as a main reader | **Add.** The product-guide question (C5 #4) is addressed to him. |
| C5 Power | Add **Parth Shah** to the ◆ questions | **Skip.** He reviews the Field Ops packet (C6) and After Hours (C9). |
| C7 Service | Add **Parth Shah** (Service Supervisor's backup) | **Skip.** Same reason. |
| C10 Billing | Re-add the three Billing Supervisors | **Keep them removed**, as you decided. |
| Denials | A new packet for **Monil Shah** (backup Bhoj Bhatt) | **Add.** Denials had no review at all, and the chapter gained a Denials section in October. |

### 2.2 The 11 approved questions the October text overtook

| Q | Approved wording | Proposed |
|---|---|---|
| C2·5 | Walkers are never shipped out of state; an out-of-state walker order is OOR | **Walkers on an insurance order are never shipped out of state**: out of state is out of range (OOR). An out-of-pocket order lifts the state limit, but never the delivery radius. |
| C2·6 | Other items: knee walkers OOP except through VGM Homelink; BP monitors wrist-only; should crutches (E0114) be in the guide? | **No change to the wording.** Only the cited section moves (the Homelink rule is now in 10.10). |
| C3·2 | Nebulizer refill supplies are handled by Resupply, at Medicare's allowances, with no more than three months per shipment | **Nebulizer refill supplies** are handled by Resupply, at Medicare's allowances. **No supply of any kind** ships more than a three-month quantity at once. |
| C3·6 | PAP rentals: CPAP and BiPAP (E0470) capped; E0471 a continuous rental, never owned | **Drop here.** Ask it once, in Billing (C10 #7), where the answer is decided. See also 2.5 F1. |
| C3·9 | Category owners: CPAP — Sonia S. · incontinence and catheter — Michelle B. · trach/suction/vent — Monica J. | **Replace with the directory-rows item (C3 #2).** The manual now names the owners only in the directory. The packet shows those rows, so the same check happens with the right names. |
| C5·7 | Medicare Advantage is primary, not secondary | **Keep as is.** The cited section is now Billing 10.7, but Power intake is who applies it on a PAR. |
| C6·5 | Facility deliveries: … PMDs never to a facility ◆ | Facility deliveries: equipment no earlier than two days before discharge; the facility covers equipment during a Part A SNF stay; supplies only after discharge. **A PMD never goes to a hospital, rehab facility or SNF, but it can go to a nursing home that is the patient's permanent residence, with the patient present** ◆ |
| C7·1 | Who pays for a repair: … no trip charge during a repair; … | **Who pays for a repair**: rental status and warranty decide, not time since delivery; and the categories where the usual rules don't apply (oxygen, frequent-and-substantial-servicing items, warranty). |
| C7·2 | Diagnostic visits: $75 OOP if no repair is needed, said before booking | **Replace with candidate C7 #1.** It states October's two conditions and asks whether the fee is $75 or $150. |
| C7·12 | Turnaround isn't quoted as a range. Referrals: are the Numotion, WSR and NSM numbers current? | **Turnaround** isn't quoted as a range: a few days for small issues, several weeks when a part comes from the manufacturer. The referral half moves to candidate C7 #2. |
| C10·13 | The knowledge check: do the answers still hold? | **Drop.** The knowledge check is training material now (`manual/training/`), not part of the manual. |

### 2.3 Candidate new questions (64)

The full wording of each is in the reviewer's `CANDIDATES.md`.

**Format note.** Your approved format has no "Why we're asking" lines, and many candidates carry their real question there. Every candidate you add will be rewritten so the statement and the question sit in one item. You'll see the result in the sample build before anything is sent.

Key: **Add** · **Opt** = optional (keep it if you want the packet thorough, cut it if you want it short) · **Skip**.

**C2 Manual Mobility** (8 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | 2.4.2 size change has no cutoff | Add | Process change in October |
| 2 | Directory rows | Add | Only check on the consolidated roster |
| 3 | Very high coinsurance (50%+) | Add | Each intake team decides for its own items, so keep it in C2, C3 and C5 |
| 4 | Bariatric below threshold; ABN? | Skip | The ABN question is Billing's (C10 #3) |
| 5 | Bariatric bed E0301 >350 lbs | Add | A threshold the chapter now states |

**C3 Respiratory & Resupply** (11 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Repeat Resupply form and subject | Add | October rewrite |
| 2 | Directory rows | Add | Replaces approved Q9 |
| 3 | Very high coinsurance | Add | See C2 #3 |
| 4 | Oximetry process | Opt | Field Ops' approved Q12 covers scheduling; this asks who performs and reads the test |
| 5 | Phone first (on-call) | Skip | Keep it in C9, where the on-call RTs are reviewed |
| 6 | After-hours DFW only; vent patients outside DFW? | Add | A patient-safety gap if the answer is yes |
| 7 | No POCs, not even out of pocket | Opt | Keep once, here; skip in C6 |
| 8 | PAP trial: split by payer? | Add | |
| 9 | APAP (G4600) | Add | New in October |

**C4 Sales** (11 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Directory rows | Add | |
| 2 | 4.5.1 a past PMD patient wants a new PMD | Add | The call goes to Sales today |

**C5 Power** (11 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Directory rows + who backs up the Power Manager | Add | The backup is blank |
| 2 | Very high coinsurance | Add | See C2 #3 |
| 3 | Dual submission (MA + traditional) | Add | New in October |
| 4 | Power wheelchair product guide (for Rajdeep) | Add | Only if Rajdeep is added (2.1) |
| 5 | When is a PT/ATP eval needed per insurance? | Add | The manual doesn't say |
| 6 | Provider refers to PT/OT | Add | New |
| 7 | Virtual ATP scheduling owner ◆ | Add | Also feeds F7 (the directory routes it wrong) |
| 8 | Standard vs complex rehab PWC | Add | New |
| 9 | 4.5.1: should the within-5-years call go to Power? | Opt | Reword to just the routing question; C4 asks the rest |

**C6 Field Operations** (14 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Directory rows ◆ | Add | |
| 2 | POCs | Skip | Asked in C3 |
| 3 | Ramps OOP only | Opt | Low stakes |
| 4 | Backorders: re-contact, substitutes, cancel/refund | Reword | Fold the questions into approved Q9 (backorders). No new item |
| 5 | Tanks to a facility for general stock | Add | New; "rare exception" is undefined |
| 6 | San Antonio market value for oxygen tickets | Skip | Unclear what it asks. Tell me if you know |
| 7 | Swap-outs: pick up now or bill until done? | Skip | One home: Billing (C10 #5) |
| 8 | Mask fitting → Field Ops Q | Skip | Approved Q4 already says this |
| 9 | Texas Medicaid delivery timing (6.4.5) | Add | No question covered it |
| 10 | Oximetry | Skip | Approved Q12 |

**C7 Service** (15 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Diagnostic visit $75: the two conditions; $75 or $150? | Add | Replaces approved Q2 |
| 2 | A PMD we can no longer service | Add | Takes the referral half of approved Q12 |
| 3 | Directory row | Add | |
| 4 | Lost package → FedEx claim | Add | New |
| 5 | Swap-outs | Skip | Billing (C10 #5) |

**C8 Oxygen** (6 approved): no candidates.

**C9 After Hours** (5 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | Directory rows | Add | |
| 2 | 30 minutes between every step | Add | |
| 3 | Phone first | Add | |

**C10 Billing** (15 approved)

| # | Item | Rec. | Why |
|---|---|---|---|
| 1 | PWC rent-to-own: waive rather than pick up | Add | |
| 2 | Texas Medicaid CPAP (10-month purchase? children 50%?) | Add | |
| 3 | Bariatric below threshold: ABN? | Opt | |
| 4 | Pick-up write-offs | Add | Keep here only, not also in Denials |
| 5 | Swap-outs billing | Add | The one home for this question |
| 6 | Complex rehab PWC purchase exception | Add | New in October |
| 7 | E0471 capped or continuous? | Add | Replaces C3·6; see F1 |
| 8 | Oxygen repairs not reimbursed | Add | |
| 9 | E0431 cylinders under capped rental? | Add | See F1 |
| 10 | Dual eligibles billing order | Add | Corrected in October |
| 11 | Upgrade fee amounts vs the sheet | Opt | |
| 12 | 4.5.1 Same or Similar exception | Add | |
| 13 | Oxygen restart example dates | Add | Also covers F15's 64-day question |

**Denials (new packet)**

| # | Item | Rec. |
|---|---|---|
| 1 | The two direct-to-member calls | Add |
| 2 | Directory row | Add |
| 3 | Claim Prep tab, RR/NU modifiers | Add |
| 4 | Write-offs | Skip (C10 #4) |
| 5 | Denials and appeals (120 days) | Add |
| 6 | Prior authorizations by intake | Add |
| 7 | Anything a CSR should know | Add (the standard closer) |
| 8 | What should a CSR collect before transferring? | Add |

**What these recommendations add up to:** about **147 questions** with every Add and Opt, about **140** without the Opt items, against your trimmed 96.
- The directory-rows items (9) and Billing's (13) are most of the growth.
- If you want it nearer 96, the first cuts I'd make are the Opt items and C10 #11.

### 2.4 Formatting and print decisions (still open)

Each item is a choice about how the manual looks or prints. None changes what it says.

| ID | What you'd be deciding | My recommendation |
|---|---|---|
| A5 | **3.12 compliance tables.** Your approved September version had one table in 3.12.2 with an HCPCS code column, and no second table. The repo got the old version back: 3.12.2 without HCPCS, plus a second item table in 3.12.3 that repeats it. Should I put HCPCS back in 3.12.2 and remove 3.12.3? | **Yes.** 3.12.2 keeps October's "If not met" column and gains HCPCS. |
| A6 | **The printable PDF.** Your approved edition's PDF had a cover page, a contents page and clickable bookmarks. Today's PDF is just the Word file saved as PDF: no cover, no contents. Options: (a) add a cover and a contents page to the Word manual; (b) bring back the separate HTML-to-PDF script; (c) leave it. | **(a).** One print path to keep working. |
| C8 | **Diagram text in print** comes out about 5 pt, because the wide diagrams are shrunk to fit a portrait page. Options: (a) print the 16 diagram pages landscape (text ~7.4 pt); (b) leave it, since the HTML and app versions are full size. | **(a)**, if people print the Word manual; otherwise (b). |
| D7 | **Printing from the HTML manual.** Today Ctrl+P prints only the quick-reference cards (by design). Should a section have a "Print this section" button, so a CSR can print the procedure they're reading? | **Yes**, plus a "Print cards" button. Ctrl+P keeps printing the cards. |
| D9 | **Where the Messages button is.** The manual says "bottom right" in 0.10, 0.10.5, 0.11.1 and the icon guide. The reviewer says your Transaction Work Flow screenshot shows it **bottom left**. Which is right? | You know the screen. If bottom left, I change all four. |
| D10 | **The sidebar shows "Chapter 10" twice** (Billing & Denials, then the Billing reference). This is intentional. Relabel the second one? | Optional: "10 · Billing reference". |

### 2.5 Content: your call or Billing's

| ID | Item | My recommendation |
|---|---|---|
| F1 | E0471 described as "continuous rental, never owned" in 8 places | **Checked: the reviewer is right.** CMS final rule CMS-1167-F moved E0471 from frequent-and-substantial-servicing to **capped rental** on 1 April 2006. 42 CFR 414.222 excludes bi-level respiratory assist devices, with or without a backup rate, from the servicing category, and 2026 references still list E0471 as capped rental. **Fix all 8 places**; C10 #7 becomes a confirmation. |
| F1 | E0431 cylinders listed as capped rental (10.2.1) | **Checked: the reviewer is right.** E0431 is the portable gaseous add-on in the **oxygen** payment class, under the 36-month rule, not the 13-month capped rental. After month 36 only the contents (E0443) are billed. **Fix**; C10 #9 becomes a confirmation. |
| F1 | Rental-timeline diagram: "fee every 6 months" after month 36 | **Checked: the reviewer is wrong here; the diagram is closer to right.** After month 36, Medicare pays one maintenance-and-servicing visit per 6 months (MS modifier), starting 6 months after the rental ends, under 42 CFR 414.210(e)(5) since July 2010. It applies to **concentrators and transfilling equipment only**, not gas or liquid. It needs a real visit, and the patient owes the 20% coinsurance on it. Repairs and parts are still never separately paid. So: keep the diagram (reword to "one servicing visit every 6 months, concentrators only"), and **add this to 10.12.2 and 7.3.1**. October's edit to 7.3.1 over-corrected by removing it. C10 #8 is reworded to confirm this. |
| F2 | K3 Guardian 20": "K0003 with E2201 for a patient over 250 lbs" | **Fix.** Over 250 lbs is K0006, and E2201 covers 20" up to, but not including, 24". C2 Q1 still asks Manual Mobility. |
| F3 | 7.3.2: no "free when a fault is found and repaired" line; 1.1 and Card 7 word it differently | Add the line; make 1.1 and Card 7 match 7.3.2. |
| F8 | Card 0 "Pat. Resp. — what they owe" vs 10.19.1 | Fix Card 0 and 0.10 to say pre-delivery balances; billed ones are in Invoices. |
| F8 | Card 1 dropped the abusive-caller "warn once" rule | **Decided: add it back to Card 1.** The oxygen-ownership line stays on Cards 8 and 10. |
| F8 | Card 10 has no Denials routing line | Add one. |
| F9 | 1.6.1 "a complaint record must include" (5 fields, no MBI) | Reword the lead-in as suggested. |
| F10 | "Pick-ups are created by CSRs or the Denials team; no separate form or queue" was lost | Restore it in 10.14. |
| F11 | Spanish Queue row says "Direct", but 1.7 and Card 1 say never transfer directly | Change the row to not-direct (the text is the rule). |
| F11 | B.1 says every name is in full; the three category owners are "Sonia S." etc. | Give me their full names, or I'll reword the B.1 line. |
| F12 | 6.16 FAQ treats a nursing home like an SNF | Reword to separate the two, matching 6.4.4. |
| F15 | "Medicaid is billed primary" for bed upgrades (Rule B); E0621 sling a capped rental; the 64-day boundary ("less than" vs "≤") | Leave the text alone; these go to Billing in their packet. I'll align "less than"/"≤" once they answer. |

### 2.6 Fixing without asking (unless you object)

A1–A4, plus:
- **F4:** restore the Texas Medicaid one-month line in 3.3.2.
- **F5:** remove the after-hours tank line, since 9.3 sends supplies to business hours.
- **F6:** point "Notify an RT" at the On-Call Respiratory Therapist.
- **F7:** ATP box → "Field Ops-Power schedules", the Virtual ATP row's routing, the PAR email subjects, and Card 5's virtual-ATP exception.
- **F11:** the leads table gains Denials, and the stale roster notes are fixed.
- **F12:** every leftover (wrong counts, the 3.3.3 diagram cite, the pick-up diagram wording, the router row, the 1.3 ↔ 10.22 circle, "an traditional", "1 / 3 months", the doubled T3Q link, the SNF row link, the garbled Open-items rows).
- **F13:** the glossary (Sales tags, the "Chapters" header, the "All" bug, MA replaces Parts A and B, Central Time).
- **F14:** the changelog numbers and the two missing "formerly" search aliases.
- **D4:** the 5.1.1 swatches.

Each fix gets a changelog line, as usual.
