# CSR Procedures Manual: update plan

Every item on your list (all 425 lines) was checked against the source in `manual/`. Two more checks were made: what each design request costs in the build and in the app, and the federal-rule items against CMS sources.

**Nothing has been changed.**

Status codes used in Appendix 1:

| Code | Meaning |
|---|---|
| ✅ | Clear; I do it as written |
| ✏️ | Clear, with a small wording tweak suggested |
| ❓ | Needs an answer from you |
| ⚠️ | Conflicts with other manual text, or is a factual/CMS concern |
| 🖼 | Needs an image or URL from you |
| 🛠 | Needs build or app work first |

---

## Part A: Decisions

### A0. Recorded 2026-10-06

| Topic | Decision | What it means for the work |
|---|---|---|
| Unit name | **Chapter** | Medicare Part A–D untouched. |
| Sales move | **Full renumber with an app id migration** (Phase 4) | One old→new map drives: the cross-references, packets, roster, glossary, equipment, changelog, diagrams, a "formerly 9.4" search alias, and a one-time rewrite of the app's history tabs (comments, views, flags, revisions, bookmarks, training, quizzes). Deploy first, then import. |
| 1.7.1 HICN | **Delete the field** | 1.7.1 covers every complaint, not only formal Medicare ones, and the MBI is in the CRM when a formal complaint needs it. "Six fields" becomes "five" in 1.7.1, 1.7.3 and Card 1. |
| 10.6.3 QMB | **Downgrade to Policy** | Critical is kept for urgent patient-safety items. See item 6 in A1 for the matching sweep of the other 12 Critical banners. |
| 6.3 "no trip charge during a repair" | **Delete** | Exceptions exist, so the absolute rule goes. Card 6 and the Service packet row that repeat it go too. |
| 3.3.3 3-month limit | **Move to 3.3.2** | 10.19's link re-points there. |
| 3.7.4 "if the trial fails" | **Re-checked for 2026; split by payer** | See note 1 below. |
| "original" Medicare | **"traditional (Original) Medicare"** on first use per chapter | Plus a glossary alias. |
| Power Manager | **Rajdeep Thakar** | New roster row. Backup for Qualifications, PAR Standard, PAR Appeals and the PAK team. Also answers 4.10.2: the product guide goes to Rajdeep in the Power packet. |
| Denials | **Denials Q, ext 101; manager Monil Shah** | New roster rows (queue and manager). 10.18.3 gains your two scenarios, both ending "…otherwise the Denials Q (ext 101)". Monil is added as a reader of the Billing packet's Denials questions (◆). |
| Ventilator / IPPB pick-ups | **The CSR creates the pick-up ticket; Field Ops reviews every ticket and decides if more is needed** | See note 2 below. |
| Design proposals | **All approved** | The colour-family swatch mock is still shown before it's applied. |

**Note 1: 3.7.4 "if the trial fails", checked for 2026.**
- **Medicare:** Medicare's PAP coverage policy (LCD L33718, current revision) still requires **both** an in-person re-evaluation **and** a repeat **facility-based** sleep study (a "Type 1" study, which can be diagnostic, titration or split-night). A home test (VirtuOx) does not re-qualify.
- **Medicare Advantage:** since CMS's 2023 rule (CMS-4201-F), MA plans must follow Medicare's coverage criteria, LCDs included. So the same rule applies.
- **Medicaid and commercial plans set their own rules.**
  - Some commercial plans accept a home test.
  - A Texas Medicaid health plan's published PAP guideline (Texas Children's Health Plan) uses:
    - a 3-month trial;
    - ≥4 hours on 70% of nights for adults (50% for 18 and under);
    - up to 7 more months of rental;
    - **purchase after 10 months**, not Medicare's 13.
  - I couldn't open the TMHP (Texas Medicaid) manual itself, so Billing should confirm before the 10-month point is written in (open item 15).
- **New wording:** "For Medicare and Medicare Advantage, if the adherence standard isn't met within the first 3 months, Medicare stops paying. Requalifying needs both a new in-person evaluation and a repeat sleep study in a sleep lab — a home sleep test doesn't count. Medicaid and commercial plans set their own requirements, and some accept a home test; check the plan."
- The same change goes into 10.14 and Card 3. It stays a banner.

**Note 2: ventilator / IPPB pick-ups.**
- 3.10.1 and 3.11 change to the rule above.
- The equipment notes that print "cannot be picked up without a discontinue prescription" (Trilogy, IPPB) are reworded to match, which ends today's contradiction with 3.2.
- 5.9 gains one line: Field Ops reviews every pick-up ticket.

### A0b. Recorded 2026-10-06, second round (items 1–30)

**Working rule (your item 10):** a point only a department can confirm doesn't block the update. The manual keeps its current text, or wording that promises nothing, and the question goes into that department's review packet (Part F). Every item marked **→ packet** below is handled this way.

**Structure, outputs and banners (items 1–6)**

| # | Item | Decision / handling |
|---|---|---|
| 1 | Fold Sales Eligibility | **Yes.** Sales Eligibility (4.2) and the Qualified-Lead path join the new Sales chapter; Power starts at PAK. |
| 2 | Close numbering gaps | **Yes**, inside the renumber. |
| 3 | Word extracts | Explained again below; still open (item 3). |
| 4 | 4.2.3 hover bug | It was in the HTML manual from the original chat. The bug is real there and affects every role link. Phase 1 adds per-row directory anchors, and the preview shows just that person's row. The app already lands on the right row. |
| 5 | PDF | It is the Word / Google Docs file. Phase 1 fixes the blank pages (separate page-break paragraphs plus an empty spacer after every table) and makes the Word file carry images, diagrams and working links, which it drops today. |
| 6 | Critical banners | Kept as **Critical**: 911/emergencies (1.4.1, 8.1), ventilator priority (3.10, 6.5), oxygen distress (7.3, 7.6), escalation distress (8.4), **caller verification (1.3 only; the 10.23 copy goes)**, the **Medicare-caller note (1.7)**. QMB (10.6.3) becomes Policy. Anti-kickback (10.23) becomes **Watch-out**. Front-page definition: "Patient safety, or a legal requirement (HIPAA, Medicare) where a mistake is serious — act on it." |

**Billing / Denials (items 7–16)**

| # | Item | Decision / handling |
|---|---|---|
| 7 | Claim Prep tab | New Billing subsection plus your screenshot. Content: <ul><li>the tab lists the order's items;</li><li>each shows *(paid / eligible)* months — "(1/1)" is a paid purchase; "(8/13)" means 8 months paid out of 13 eligible since delivery.</li></ul> It is linked from 4.9.1 ("one-time payment received — check Claim Prep") and from the write-off section. |
| 8 | NU / RR | The same subsection gets a short modifier table that leads with **RR = billed as a rental** and **NU = billed as a new purchase**. Default: modifiers are read on the Claim Prep tab; tell me if they're somewhere else. |
| 9 | Pick-up write-off | New Billing subsection, linked from 4.9.1 and 5.9.1. <ul><li>Field Ops decides, sends the write-off notice and contacts the patient.</li><li>**Company decision** (not worth recovering): the remaining balance is written off and the item becomes the patient's.</li><li>**Failed pick-up** (no response, or refusal): the balance stays on the account, the patient is still liable and may return the item later; we can't force payment.</li><li>CSRs never promise either outcome.</li></ul> ⚠️ Wording: see item 89. |
| 10 | Rent-to-own refund claim | → packet (Billing). |
| 11 | Coinsurance refusal | Text: "orders with a very high coinsurance (often 50% or more) may be declined, depending on the item; the intake team decides". → packet (each intake lead) for the real rule. |
| 12 | Denials | Monil Shah's backup is **Bhoj Bhat** (Billing manager). Denials members take direct transfers. Monil gets **his own packet** (new Denials packet: 10.18, 10.9, 10.15, Claim Prep, NU/RR, write-off and the scenarios). |
| 13 | Compliance grace period | **About 1 month, for every compliance item.** It goes into the compliance stages (3.12.1, 7.8.2 and 10.14 together): "after a lapse there's a grace period of about one month (courtesy delivery possible, unless noted otherwise); after that, and once the patient has been told several times, it's persistent non-compliance and a pick-up ticket may follow." |
| 14 | Compliance validity | Text: <ul><li>"Compliance is confirmed by the compliance team once up-to-date clinical notes (within 6 months) are received, and it's noted with an end date — e.g. *compliant until October 2027*. Check the notes for that date."</li><li>Persistent = more than one month past the grace period, after several notices.</li></ul> |
| 15 | Texas Medicaid CPAP | → packet (Billing). The 3.7.4 banner says only "Medicaid and commercial plans set their own requirements". |
| 16 | Bariatric below the threshold | Text: "can be provided if the patient pays the difference — amounts are on the Upgrade Fee (Mobility) sheet [link]". ABN → packet (Billing, MM). See item 90. |

**Service / Field Ops (items 17–28)**

| # | Item | Decision / handling |
|---|---|---|
| 17 | Diagnostic visit fee | → packet (Service): $75 or $150, plus the photo/video condition. The text keeps $75 until answered. |
| 18 | Package stolen | Service owns it. <ul><li>No police-report requirement.</li><li>Service opens a lost-package claim with FedEx.</li><li>If FedEx reimburses (rare), a replacement is shipped.</li></ul> Added to 6.1, 6.2 and the 5.1.2 routing row. |
| 19 | Backorder response policy | → packet (Field Ops). 5.11 keeps its policy with your edits. |
| 20 | Swap-out billing option | → packet (Service, Field Ops, Billing). |
| 21 | 6.14 | **Removed** (your lean). The Service packet asks whether any referral guidance should replace it. |
| 22 | Oximetry process | → packet (Respiratory, Field Ops). 5.15 keeps its current text plus your "scheduled simultaneously" edit. |
| 23 | Oxygen coverage area | **Within 50 miles of Dallas or 50 miles of San Antonio** → the new El Paso FAQ, and 8.5's note. <ul><li>8.1.1's sentence implying vent patients outside DFW is reworded neutrally.</li><li>Vent patients outside DFW and a San Antonio O2-ticket market → packets (Respiratory, Field Ops).</li></ul> |
| 24 | 8.4 escalation chain | Steps 3–5 stay. The timing between steps 1 and 2 is item 88. |
| 25 | RT phone-first | **Yes, for RTs on vent calls too.** No contradiction: the CSR still dispatches a vent call immediately and never troubleshoots it; the RT's own first step is to call the patient. It goes in the new "For on-call technicians and RTs" section. → packet (Respiratory) to confirm. |
| 26 | "After Hours" Service Type | **Yes**, added to 8.7 step 2. |
| 27 | 7.8.4 "no patient attached" | Text: "We don't deliver oxygen tanks to a medical facility for general stock — a request not tied to a named patient — except rarely; check with `[ROLE: Field Operations Supervisor]`." This is a separate rule from the hospital-discharge one, so it no longer conflicts with 5.4.3. → Field Ops packet. |
| 28 | Insurance rep complaining about a service refusal | Route to `[ROLE: Service Supervisor]`. This also fixes the role link that pointed at the wrong person. |

**Power / Sales (items 29–31, 53)**

| # | Item | Decision / handling |
|---|---|---|
| 29 | Standard vs complex PWC | New Power subsection using Medicare's own groupings (power wheelchair LCD L33789): <ul><li>**Standard** = Group 2 with no power options.</li><li>**Complex rehab** = Group 2 with single or multiple power options, and Group 3 and up.</li><li>Complex rehab needs a specialty evaluation (PT/OT or physician) and an ATP's involvement in selection.</li><li>Complex rehab keeps the option to bill as a purchase at delivery; standard chairs are rental only.</li></ul> Billing's "no purchase option" line gets that exception. → packet (Power, Billing) to confirm. |
| 30 | PAK Appointment Scheduling, T3Q | New roster roles: **PAK Appointment Scheduling** → Erica Thongvan (PAK team manager); **T3Q** → Ahmed Ramadan (Qualifications manager). T3Q added to the glossary — see item 91. |
| 31 | Erica's surname | **Thongvan** (from your answer). Resolved. |
| 53 | Qualifications backup | Rajdeep Thakar goes on Ahmed Ramadan's (Qualifications manager) row. Resolved. |

### A0c. Recorded 2026-10-06, third round (items 31–41)

| # | Item | Decision / handling |
|---|---|---|
| 31 | Erica's surname | **Thongvan.** |
| 32 | 4.7 denial when the patient is unaware | Once the denial is confirmed in the notes, the CSR can say "it appears we received a denial from your insurance; our team is reviewing the response in detail for a possible appeal." |
| 33 | Authorization (PAR) team | **Kadija Sylla, Ashton Elumalai, Bella Singha, Parker Roychowdhury.** <ul><li>New roster role "Power Authorization (PAR) Team" listing all four. Every "Authorization team" link and hover shows the four.</li><li>The existing Standard (Kadija) and Complex/Appeals (Ashton) rows keep their surnames.</li><li>Bella's and Parker's specialties: item 93.</li></ul> |
| 34 | Dual submission | New text in 4.7.2: <ul><li>"Some PARs are submitted to both traditional Medicare and the patient's Medicare Advantage plan — the notes say **dual submission**."</li><li>"If the MA plan denies but Medicare approves, Medicare's approval is sent to the MA plan to support the case for approval."</li></ul> The old "both Medicare and an MA plan… can add two weeks" policy is rewritten around this. → Power/Billing packet: confirm the wording. |
| 35 | Brand-new lead | A new first row in 9.4/9.5: name and DOB, then the caller's phone number; if no record appears → **transfer to the Sales Q**. |
| 36 | Ramps | → Field Ops packet (the existing FAQ row). No new section. |
| 37 | Payor/HCPCS Order Acceptance sheet | It is the original sheet behind the app's InsurancePayors tab, which you reformatted for the app. 4.2 and 4.12 link **Reference → the insurance lookup**, the live, searchable version. The original sheet's URL is optional (Appendix 2). |
| 39 | POC out of pocket | **Stays "not carried"** for now. → Field Ops packet: was it ever allowed OOP, and is it still? (Field Ops places the manufacturer orders.) |
| 40 | Ventilator fallback | **Service Q first. If no answer, email respiratory@ and service@ and notify an RT.** Applied everywhere: 3.1, 3.10, 6.5.1, 6.5.2, Card 3, Card 6. |
| 41 | Repeat Resupply format | It's the app's email-tool subform (from the app's own code). <ul><li>Fields: Item Category · D.O.B. (optional) · Requesting Month · Last Scheduled Date · Same items & quantity as previous · Address (Same / Different + new) · Insurance (Same / Changed + new plan and member ID) · Provider (Same / Changed + new provider and phone) · Note.</li><li>Subject: **"[Category] [Month] Resupply: [Patient name], DOB: [date]"** — e.g. "CPAP March Resupply: Jane Doe, DOB: 01/02/1950".</li><li>3.3.1 step 3: "If yes, email the Resupply team using the **Repeat Resupply** update type in the email tool", followed by the fields and subject above. This also covers your "Subject format:" edit.</li></ul> |

### A0d. Recorded 2026-10-06, fourth round

| # | Item | Decision / handling |
|---|---|---|
| 3 | Per-department Word files | **Goal (yours):** the master manual replaces the separate department guides, and any department's guide can be pulled out of it with minimal effort. **Design:** an extract manifest (`data/extracts.json`) says what each department guide contains: <ul><li>whole chapters (default: 0, 1, its own chapter, and 10, Billing);</li><li>any extra individual sections from other chapters (e.g. Service's guide pulling 5.9 pick-ups);</li><li>its quick reference card;</li><li>the glossary and directory filtered to that department.</li></ul> Changing a guide means editing one list, not the text. The build checks every cross-reference inside an extract and turns any reference to a section the guide doesn't include into a plain "see the full manual, 5.9" note, never a dead link. Built in Phase 1. |
| 38 | PT Evaluation Team row | **Deferred.** The row stays as it is for now, so 4.5's link keeps working. |
| 42 | Size changes | **No cutoff.** Rewrite 2.4.2 and 2.11 around examples: <ul><li>Before delivery: the caller can ask for a different size; the Manual Mobility team acts on it, depending on the circumstance.</li><li>After delivery: still possible; Service, or a pick-up-ticket swap, depending on the circumstance.</li></ul> The "before validation / reopened after validation" wording goes. |
| 43 | MDS450EL | It's the Medline battery lift. Add "MDS450EL" to its name; the MDS700EL uses its photo. |
| 44 | Knee walker | **$199.** Fee data updated (was $200, flagged "verify"). |
| 45 | "Non-billable supplies" | In 7.2.2 (the O2 ticket steps) and 7.4.1: "When creating an O2 supplies service ticket, add the **non-billable supplies** tag in the `Ticket` tab." |
| 46 | 3.2 title | **"Department specific amendments"** (also used in 0.6's reference). |
| 47 | E0191 heel protector | New item. Category "Other Medical Devices" (Manual Mobility); **OOP $9.76 for 2 units**; photo later. Default home: a short "Other medical devices" section at the end of Chapter 2. |
| 48 | Upgrade Fee Sheet entry | Kept and redefined. |
| 49 | Service in the directory | Service sits under the **Field Ops Manager (Parth Shah)**; **Service Supervisor = Arnav Pan**. No separate Service Manager row. The "Arnav Pan or Parth Shah" escalation row folds into the Service Supervisor. |
| 50 | Queue-owner rows | Every department's queue row consolidates into its manager's row. The queue names stay in the "how to reach" column. |
| 51 | RT manager | Parth Shah (Field Ops Manager), backup Shagun Shastri. |
| 52–54 | Sales Queue / Qualifications backup / UMS App | Yes · yes · "UMS App" = the order system (CRM). It gets a glossary entry. |
| 55 | Outbound calls | New **0.14 Outbound calls**: <ul><li>Opening: "Hello, this is (name) with UniversalMed Supply **on a recorded line**, calling about…".</li><li>If the first attempt fails, try at least one other caller ID from the 8x8 outbound list, so **at least 2 attempts**.</li><li>Voicemail: "Hello, this is (name) with UniversalMed Supply calling about your order. Please give me a callback at…" — no patient details on a voicemail.</li><li>Note each attempt.</li></ul> Router row and Card 0 line too. |
| 56 | Knowledge check | **Primary:** remove it from the manual and attach it to a Training quiz (logged). **Also:** an unlogged in-manual version (answers revealed at the end) as a later, optional item (medium size, plus a deploy). |
| 57 | Front matter | Version/Built dropped. "Owner: Robin Choudhury" as a small footer line. "Your first week" → **"Where to start"**. The when/use table is shown in A1 item 57. |
| 58 | Router 1.1.1 | Delete "Is my order still with Sales?" and "It's on backorder?". Plain search still finds 5.11 by its title. |
| 59 | 1.2 Do's & Don'ts | I draft the "Do" side from the existing table, for your review. |
| 60 | Note template | 0.11.1 gets the template with your explanations. See A1 item 94 for one label difference. |
| 88 | 8.4 timing | **30 minutes after every step.** The chain is: <ol><li>call and text the details;</li><li>call again and re-send;</li><li>Level 1 backup;</li><li>Level 2 backup;</li><li>repeat.</li></ol> 30 minutes each. Level 1 is now reached at about an hour, so 8.4.1's "0–60 minutes" target carries your "what we aim for, not guaranteed" note. |
| 89 | Write-off wording | **"Waived"** for the company-decision case, since "write-off" also covers the failed-pick-up case where a balance remains. The Billing packet keeps its question on how a waiver is documented. |
| 90 | Fee tables | The sheet is the master. The manual's tables are updated from it by hand for now. |
| 91 | T3Q | Glossary: "a Qualifications sub-team in Power intake (Ahmed Ramadan) that completes the PPD for qualified leads". The "Task" numbering isn't explained. |
| 92 | Bhoj's surname | **Bhatt.** |
| 93 | PAR team | All four listed as one team, with no specialties for Bella or Parker. Kadija (Standard) and Ashton (Complex/Appeals) keep their own rows. |

### A0e. Recorded 2026-10-07 (operator note, after Phase 2)

| # | Item | Decision / handling |
|---|---|---|
| 94a | Past PMD patient, 5+ years since delivery | Goes to **Sales**, which creates a new order on the existing patient account. New **9.4.1**; pointers from 4.1, 10.13.5 and a router row (1.1.7). |
| 94b | PMD within 5 years, wants a new/different one | Usually a Same or Similar conflict. Possible exception: the new PMD is an **upgrade** and the provider attests to a **significant change in physical condition or mobility needs** since the original. In 9.4.1, with a "promise nothing" watch-out. **Routed to Sales for now (operator, 2026-10-07)**; the Sales and Power packets ask them to confirm (spec.json: Part 9 row 21, Part 4 row 29), and Billing's packet asks about the exception. The SOS and RUL glossary entries now also carry Parts 4 and 9, so those department guides include them. |

### A0f. Recorded 2026-10-07 (Phase 4)

| # | Item | Decision / handling |
|---|---|---|
| 95 | History migration | **None.** Little or no use is attached to manual sections in the app yet, so the renumber re-imports fresh: new ids as drafts, old rows removed with the orphan box. This replaces the "app id migration" in A0 and Part E. |
| 96 | The map | **Approved as drafted** — `.cycle/manual-renumber-map.md`. |

### A1. Still open

Nothing blocking. Recorded on 2026-10-06:

- **57:** the front-page row "You need a rule you half-remember" becomes **"Find a policy or term"**.
- **61:** proceed with the default.
- **94:** the label stays **"Callback Number"**, as the app writes it.

All defaults (61–87) are approved.

**Deferred:** 38 (PT Evaluation Team row).

**Supplies when you're ready:** the photos, screenshots and URLs in Appendix 2, plus the Claim Prep, NU/RR and invoice screenshots and the Upgrade Fee (Mobility) sheet link.

**Defaults I'll use unless you say otherwise** (reply only to change one):

61. 1.1.9 insurance rep row → "…requesting more information for a power chair authorization (PAR)", plus a non-power row to 0.12.2.
62. 0.8 down-arrows → the stage table becomes a ↓ step list, replacing the text chain too.
63. 0.10 icon-string screenshot → above the "where these appear" note.
64. 0.11.1 "examples" → the 0.11.2 subject examples become a two-column table.
65. 2.1 "less obvious" not-covered items → neb refill supplies, scooters, POCs, diabetic supplies, breast pumps.
66. 3.1 "not covered" column → I'll fill the blank cells and fix the pairing. Tell me if something specific was wrong.
67. 3.5.3 allowance "1 / 3 months" → everywhere allowances show, not just 3.5.3.
68. 5.4.5 Texas Medicaid timing → a footnote. Card 5 keeps one line.
69. 5.9.2 / 5.9.3 watch-outs → merged into one, in 5.9.2.
70. 5.10 "supervisor needs to approve" → the "either supervisor decides" sentence, aligned in 6.9, the FAQ and Card 5.
71. 6.10.2 watch-out → your sentence plus "filing doesn't guarantee a replacement".
72. 7.4.1 "delete watch-out" → the 7.5.3 conserver-vs-regulator watch-out.
73. 8.3.1 watch-out → replaced whole and moved under 8.3's "troubleshoot first".
74. 8.3.1 techs/RTs → one new "For on-call technicians and RTs" section holding the 8.4 notes.
75. 8.4 note → drop the 90-minute explanation; keep "keep cycling; don't contact off-schedule staff" in the table.
76. 9.2 "merge note into watch-out" → 9.2.1's pair (ask whether they've seen their doctor + stale evaluation).
77. 4.3.1 MA Education wording → replaces 4.3.1's line; the 4.3.2 duplicate is trimmed.
78. 4.5.2 → removed. The practice details leave the roster too.
79. 4.10.2 weight → the PWC table splits in two, as the scooter table does (the build caps tables at 6 columns).
80. 4.13 / 4.9 delivery-vs-ticket-date FAQ → deleted; 4.9 keeps the rule.
81. 10.3.1 → the Items and Part columns are dropped from all three billing tables, with proper category names.
82. 10.5.2 visual → a deductible-then-80/20 bar diagram.
83. 10.13.3 timely filing → one added line on what CSRs say when a claim is late (patient isn't billed). Tell me if you meant more.
84. 10.20.4 "as a table" → applied to 10.20.3's six payment steps (10.20.4 is already a table).
85. 1.6 → the generated leads table stays (no drift risk); the section merges into 1.4.
86. 1.1.6 → the "calling on behalf of my father" row moves to another router group rather than being deleted.
87. Pick-up write-off, Claim Prep and NU/RR → new Billing subsections near 10.15 / 10.20.

**Supplies:** photos, screenshots and URLs are listed in Appendix 2.

---
## Part B: Pushback, and where your list changes a fact

| # | Item | Current | Your edit | My view |
|---|---|---|---|---|
| 1 | 1.7.1 | lists "health insurance claim number" | remove | **DECIDED: delete** (general complaints don't need it; the CRM has the MBI). Was: rename. The supplier-standard rule (42 CFR 424.57(c)(19)) still requires the beneficiary's Medicare number in complaint records. The MBI replaced the HICN. → "Medicare number (MBI)". |
| 2 | 5.4.3 | DME, prosthetics, orthotics, not supplies | "DME – not supplies" | **You're right per CMS.** Keep "and orthotics", because we sell braces and the rule covers them. |
| 3 | 5.4.1 | "not to another facility" | "…another *temporary* medical facility" | A long-term SNF doesn't count either. → "not to a hospital or skilled nursing facility (one that isn't the patient's home)". |
| 4 | 4.7 | "14 days or less" | "typically take 14 days" | Fine. Medicare's target is 10 business days (about 2 weeks), so "about two weeks". Also update the Power diagram, which says "14 days or less". |
| 5 | 10.5.1 #3 | "Medigap → covers the 20%" | "Medigap (Plan F, Plan G), Medicaid, or QMB → covers the 20%" | Most Medigap plans cover the 20%, not just F and G. F is closed to anyone new since 2020. G still owes the Part B deductible. QMB/full Medicaid owe **$0 including the deductible**. → "Medigap (most plans, e.g. G) covers the 20% — G still owes the deductible; full Medicaid or QMB → $0; SLMB/QI or none → 20%." |
| 6 | 10.5.1 #4 | "Secondary never covers upgrade fees" | remove | Accurate as a coverage statement, but it reads as contradicting the Medicaid rollator waiver. Fine to remove; the same claim is also in 10.6.1 and 10.16. |
| 7 | 10.6.3 | Critical banner (QMB billing ban) | downgrade | **DECIDED: Policy.** (A1 item 6 extends this.) Was: keep as Critical. It is federal law, and the front page defines Critical as "patient safety or federal law". This is the single best home for QMB, which is currently repeated in about 10 places. |
| 8 | 10.23 | balance-billing banner | remove | It holds the manual's only statement of the Medicare assignment limit. Keep one sentence. |
| 9 | 6.3 | "no trip charge during a repair" policy | delete ("diagnostic visits have their own section") | **DECIDED: delete** (exceptions exist). Was: 6.3.2 does **not** contain this rule, and Card 6 plus the packet cite it. → Move it into 6.3.2 instead of deleting. |
| 10 | 2.2.1 | walker out-of-state rule | "OOP orders can be completed w/o regional restriction" | Your own Reference app rule (2026-09-16): **a state limit lifts for OOP; a delivery radius does not.** → Word it that way, and point to Reference → OOP price & area eligibility, which replaces the never-supplied "Delivery Radius list". |
| 11 | 2.2.2 | — | "20" MWC modifier code" | E2201 is an **add-on code**, not a modifier. I'll also add the other shared codes the section misses (E0265, E0635). |
| 12 | 3.3.2 | "Most allowances follow Medicare…" | remove "Most" | "Most" is there because incontinence (TX Medicaid) is the exception. → "Allowances other than incontinence follow Medicare…". For Medicare, charging OOP for extra supplies needs an ABN. |
| 13 | 3.3.3 | 3-month-per-shipment policy | delete | **DECIDED: move to 3.3.2.** 10.19 links to it, and it's a real Medicare limit. → Move it to 3.3.2 or 10.19. |
| 14 | 3.7.4 | "if the trial fails" paragraph | verify (VirtuOx?) | **Re-checked 2026: see A0 note 1** (Medicare + MA: lab study; Medicaid/commercial differ). **Accurate for Medicare.** Re-qualifying needs a face-to-face visit plus an in-lab sleep test, so a VirtuOx home test wouldn't do it. Only the first sentence needs rewording ("If both conditions aren't met within 3 months…"). The same text is in 10.14 and Card 3; I'd keep it as a banner, not a footnote. |
| 15 | 4.3.1 | AOR / consent policy | delete | It's the only place the procedure is written, and it has a retraining changelog entry. → Keep one sentence. |
| 16 | 1.4.2 | de-escalation table | down-arrows | Its rows are standing expectations, not steps, so arrows would imply an order that doesn't exist. Text edit only. |
| 17 | 1.1.6 | "calling on behalf of my father" row | delete | It's the only caller phrase that leads search to 1.3. → Move it to another router group instead. |
| 18 | sweep | "original Medicare" | "traditional Medicare" | **DECIDED: as recommended.** Fine as house style, but CMS, Medicare.gov and patients' MSNs say "Original Medicare". → "traditional (Original) Medicare" on first use per chapter, plus a glossary alias so a search for "original" still finds it. |
| 19 | 5.5 | "patient or designee signs" | "and technician" | 5.6.1 allows a designee to sign. → "The patient (or a designee) and the technician sign…". |
| 20 | 6.14 | competitor referrals | add "local DME repair service" | For insurance to pay, the repair provider must be enrolled with or in network for the payer. Say so. |
| 21 | 5.9.1 | "cannot get another for 5 years (SOS)" | soften to "likely difficulty" | Good. Also: the 5 years runs from the *original delivery*, and 10.15 says a long break in need starts a new rental. Billing should reconcile the two. |
| 22 | 7.9.1 | worked example (10 March → 81 days) | (moving to Billing) | The example counts a calendar month instead of a rental month and skips 31 May. I'll fix it during the move and have Billing confirm. |
| 23 | 5.14 | — | add "CST" | → "Central Time". It's CDT half the year, and Part 8 already says "Central Time". |
| 24 | 1.8.2 | — | "ask the *callee*" | → "ask the patient". |
| 25 | 0.6 | — | drop "(Field Operations)" after the EAA link | The build appends the chapter name to every cross-chapter link, so it can't be removed for one link. It goes away naturally when the EAA moves to Billing. |
| 26 | 0.13 | neutral FAQ answers | "…but I am happy to answer…" | Switches to first person where the other answers are neutral. → "…and offer to answer any general questions." Minor. |

---

## Part C: Existing errors found that aren't on your list

**Wrong or broken now**

- A role link resolves to the **wrong person.** 6.2's "Service Escalation — Insurance Complaints" points at the **Used Equipment Sales Contact**, because the matcher also searches the notes. Fix: exact name first.
- **The directory (B.1) never shows its Transfer/Direct column.** Once any row has a phone number, the build swaps that column for Phone. The data exists for every row. This answers your "add entries or delete" question.
- **Every role link** (in the HTML) opens the top of the directory.
- **Index:**
  - The "initial table" is the bucket for terms starting with a digit; its heading renders empty.
  - Section numbers aren't links, although the index intro says they are.
  - The HTML index filter is dead (it looks for the old Appendix F id).
  - The index isn't in the app.
  - The "used in more than 10 sections" filter silently drops important terms.
- **Lifecycle diagram (0.8):** section numbers on the Power boxes are the same blue as the boxes, so they're invisible. Grey text sits on dark boxes.
- **Word build:**
  - no images at all;
  - links print raw;
  - blank pages from the break paragraphs;
  - Chapter 3 and 4 colours swapped against the HTML.
  
  In the HTML, chapter heading colours stop at Part 4.
- **Front page:** lists "compliance items, state coverage" appendices that don't exist.
- **"Transfer to Billing" links** in 0.7, 0.12.2 and 6.1 point at 10.B (a quick reference with no contact). → Point them at the directory.
- **10.C** is published with a heading that promises "eleven points" and no list.
- **Data errors:**
  - oxygen cylinders are typed as capped rental, so they appear in the 10.3.1 table;
  - E0471 is classed as continuous/frequent-servicing (Billing should check; I believe it's capped rental);
  - the glossary's OOP entry says "add sales tax", contradicting 0.6.
- **Contradictions:**
  - 6.3.1 says oxygen "maintenance-and-servicing payment every 6 months". I believe CMS ended these payments; verify.
  - 7.3.3 (after hours: "dispatch immediately") contradicts Part 8 (troubleshoot first; DFW only).
  - 8.4.1's "Immediate" list omits cough assist, IPPB and BiPAP ST, which 8.3 dispatches immediately.
  - 10.10 "Medicare always billed first for dual eligibles" contradicts the waiver Rule B.

**Stale or untidy (hidden from readers but misleading)**

- Garbled line in 5's Open items.
- 6's changelog points at 6.8 instead of 6.9.
- 7's header says "Part 4".
- 10.3.3 points equipment questions at the 3.4 stub (should be 7.5).
- "My insurance changed" appears twice in the router, with different answers.
- 8.1.2 and 8.5 use the RTs' literal names, against the directory's rule that names live only in B.1.
- The stale image inventory makes the photo gaps look worse than they are. Unlisted photo gaps are just the bariatric bed and the tracheal suction catheter tray.
- The glossary has MRX and MRx as duplicates.
- Card 2 says "heavy-duty bed over 350 lb", which Part 2 never states.

---

## Part D: Design / UI / UX recommendations

1. **Real tables everywhere** (A9). This alone fixes several items on your list.
2. **Do's & Don'ts:** a header convention, "✓ Do | ✗ Don't". It is readable with no colour at all, and the build, Word and app tint the columns green and red. It applies to 1.2, 1.4.2, 7.7, 10.21.1 and 10.21.2. App part: small, needs a deploy.
3. **Step tables with ↓ connectors:** any table headed "Step | Action" draws as a vertical flow. That's about 28 tables, including 1.7.2, 0.8, 1.5, 1.6 and 1.8.x. They stay tables underneath, so search and preview landing keep working. App part: small, needs a deploy.
4. **Chapter colour families:**
   - Field Ops, Field Ops-Power and Service in one green family.
   - Sales and Power in one blue family.
   - Eligibility/Manual Mobility and Respiratory/Resupply in one violet family.
   - Billing amber.
   - Core and Call Handling neutral navy.
   - A two-tone left edge for cross-department sections is possible.
   
   This goes on chapter headings (all of them, not just 0–4), cards, the nav, and an accent strip in the app reader. I'd send a swatch mock for approval first.

   **Status 2026-10-06:** palette v2 (distinct hues within each family) + option A (a thin family stripe beside the chapter stripe) + a round icon badge BEFORE each chapter title, also on the sidebar and chips. Icons per the operator: headset, phone, walker, PAP mask, clipboard, lightning bolt (Power — chosen over three wheelchair drafts), truck, the CRM's Repair icon from 0.10.1 redrawn as an outline (Service), crescent moon, oxygen tank, dollar. **Approved 2026-10-07 WITHOUT the family stripe** (one chapter stripe, as v2). The colours and icons live in `manual/data/chapter_style.json`, the one source every output reads.
5. **Clearer hierarchy (414):** chapter number in a coloured chip, 4.7-level headings with a left rule, 4.7.4-level smaller. Points stay as unnumbered bullets.
6. **Front matter as a distinct "Start here" panel.** The five banner types are shown as real coloured examples (no code; the renderers already colour them). "Confidential – Internal Use Only" moves to an HTML footer line; the Word footer already has it.
7. **Equipment "spec cards"** (photo plus a two-column spec grid) instead of wide tables. Medium size, build only, no deploy.
   - **Limit:** every product photo is stored at 160 px. Making images "bigger" past about 160 px will look soft until higher-resolution originals are supplied. Can you get the originals?
   - The multi-image carousel (2.5.2) is medium size, needs a deploy, and should come later. The data already holds a rollator with 3 photos.
8. **Index:**
   - real links with hover previews;
   - an A–Z rail while scrolling;
   - an "explanation" column only for abbreviations (the glossary covers the rest);
   - HCPCS entries showing the item name, with a thumbnail on hover in the HTML;
   - a curated `index.json` (extra and excluded terms) so it stops indexing section titles like "How…/What…/Is…";
   - optionally the index in the app as well.
9. **Quick reference cards:** redesign after the content settles, so the cards reflect the final rules. Each card gets a header in its chapter colour, the 4–6 most-asked items, and a red "Never" box. Cards 0 and 1 get rebuilt around the most common calls (your list).
10. **Footnotes** as superscripts with a per-section Notes list (A8). I'd keep the high-stakes banners (3.7.4's watch-out, for example) as banners and footnote only background detail.
11. **Preview before import:** after each phase I can publish the built HTML manual as a private page, so you can review it before importing into Reference.

---

## Part E: Phases

Each phase = one PR. The build and export validators fail on any broken reference, so every phase ends green before you import. After **every** phase, re-import via Reference → Manual → Check → Import.

**Before Phase 4**, if Option A is chosen, also do the following. This ships with the code; deploy first, then import:

- the app id migration;
- teaching the app's chapter sorting and number search the word "Chapter".

Diagram changes always ship with the code (a deploy).

Phases in order of risk:

- **Phase 1: Foundations.** Mostly the build; small app items.
  - Fix the role links: exact-match resolver, per-row directory anchors in HTML, the Transfer column.
  - Real tables (A9).
  - Footnote step.
  - Do/Don't and Step-table conventions, and the colour families (after your swatch approval).
  - Index fixes.
  - Word page breaks, images and links, plus a PDF step.
  - "Start here" front matter.
  - Department extract manifest, `data/extracts.json` (A0d item 3): chapters plus extra sections per department guide, Chapter 10 by default, and references to sections outside the guide rendered as "see the full manual".
  - Owner footer line; Version/Built removed.
  - Size: M–L, 1–2 sessions, one app deploy.
- **Phase 2: Text edits, chapter by chapter, using current numbering** so they match your list.
  - Batches: 0–1 · 2–3 · 4 + 9 · 5–6 · 7–8 · 10 + appendices.
  - Items marked ❓ wait for your answers; everything else proceeds.
  - Size: L in total, about 6 sessions.
- **Phase 3: Consolidations and deletions.**
  - 7.9, EAA and O2 billing → Billing.
  - Waiver matrix: one home, generated tables kept.
  - Compliance: one table with an "if not met" column.
  - 6.9 → 5.10; 6.6.3 link; 5.6.2 folded into 5.6.1; 1.6 into 1.4.
  - Deletes: B.2, 10.C, 10.3.4, 10.A.
  - Duplicate scripts trimmed: the 36-month ownership script is copied about 10 times; QMB about 10.
  - Size: M–L.
- **Phase 4: The one renumber event** (A2–A4): Chapter rename, Sales to Chapter 4 (with Sales Eligibility and QL folded in), Part 10 → "Billing & Denials", gaps closed, diagrams relabelled, app migration and deploy, search crosswalk. Size: L.
- **Phase 5: Directory, glossary, index, cards.**
  - B.1 personnel changes (yours plus the missing Power Manager), consolidated, A–Z, hyphen placeholder, phone column last.
  - Glossary additions: COBRA, remittance, overutilization, NU, RR, T3Q, "UMS App". (EGHP and MSP already exist.)
  - Index curation; cards redesign.
  - Size: M.
- **Phase 6: Review packets.** All the "add to X's packet" items, plus new reviewer notes (Monil, Rajdeep, Parth Shah on 4.6). Size: S–M.
- **Phase 7: Sweeps and finish.**
  - MA (Medicare Advantage vs Medical Assistant): spell out "Medical Assistant" and keep "MA" only for Medicare Advantage.
  - "traditional (Original) Medicare".
  - Footnote candidates.
  - A cross-reference audit: every link checked so it answers what it promises.
  - Billing cross-check.
  - PDF spacing pass.
  - Rolling: images and URLs as you supply them.

Why text before structure: your list uses today's numbers, so editing first keeps every diff easy to check against it. The renumber is then a mechanical pass over finished content, and it happens once.

---

## Part F: Review-packet questions collected so far

These go into the packets in Phase 6, alongside the "add to X's packet" items on your list. Each question quotes the manual's current wording, so the reviewer can confirm or correct it in place.

**Billing (Bhoj Bhat and the Billing supervisors)**
- 4.9.1 rent-to-own: does a pick-up mean the insurance expects months already paid to be refunded? (Under a Medicare capped rental, paid months are normally earned.)
- Texas Medicaid CPAP: purchase after 10 months of rental? Children's adherence at 50% of nights?
- Bariatric below the weight threshold (patient pays the difference): is an ABN needed for Medicare?
- Write-off (company decision): how is writing off the remaining coinsurance documented? (item 89)
- Swap-out "keep billing until the new order completes": what's the rule?
- Complex-rehab PWC purchase option: confirm the exception to "no purchase option".
- E0470 vs E0471 billing difference (your 3.7.2 item). Is E0471 capped rental or continuous? The data says continuous.
- Oxygen maintenance-and-servicing payment "every 6 months" (6.3.1): still paid?
- 10.10 "Medicare is always billed first for dual eligibles" vs Rule B (Medicaid primary for the bed): which is right?
- Upgrade Fee (Mobility) sheet vs the manual's fee tables: confirm the amounts match.

- PMD within 5 years (9.4.1): the upgrade + change-in-condition exception — is it described right, and does Billing see it as a Same or Similar exception or as a different item?

**Denials (Monil Shah, new packet)**
- 10.18.3's two scenarios; the Denials Q (ext 101); direct transfers to members.
- Claim Prep (paid / eligible) and RR / NU: is the description right?
- Write-off types and who tells the patient.
- Anything in Denials' process a CSR should know that the manual lacks? (Its Denials content is thin.)

**Sales (Mary Carson) — already in `packets/spec.json`, Part 9 row 21**
- 9.4.1: the 5-year rule and the within-5-years exception as written; the within-5-years call goes to Sales for now (operator, 2026-10-07) — confirm, or should it go to Power? Who decides whether the provider's attestation is enough?

**Each intake lead (Manual Mobility, Power, Respiratory & Resupply)**
- At what coinsurance level is an order declined, and does it depend on the item?

**Service (Arnav Pan; Parth Shah)**
- Diagnostic visit fee: $75 or $150? Charged only when no photos/video were sent, or when a recent visit found nothing?
- 6.14 was removed. Should any referral guidance replace it?
- Lost-package claims with FedEx: is the process described right?

**Field Ops (Parth Shah; Ozaire Hawa; Mahesh Patel)**
- POC: was it ever allowed out of pocket, and is it still? (item 39)
- Ramps FAQ row (item 36).
- Backorder response: re-contact cadence, substitutes, cancellation, OOP refunds.
- Oxygen tanks for a facility's general stock: the rare exception and who approves.
- Is there a San Antonio market value for oxygen tickets?
- OOP POC: do we offer it? (your 7.10 item)
- The 4.9 / 5.4.4 delivery-to-facility rule (your 4.9 item): a nursing home that is the permanent residence is allowed.
- Mask fitting, swap-outs, ramps, the 5.4.5 Texas Medicaid timing (no packet row today).

**Respiratory & Resupply (Nikunj Solanki; RTs)**
- Oximetry: the process and use case, and who performs and reads the test.
- RTs phone the patient first, including on vent calls: confirm.
- Any vent patients outside DFW?
- POC out of pocket: sold?
- The "if the trial fails" wording, split by payer.

**Power (Rajdeep Thakar; Ozaire/Shah where marked)**
- 9.4.1 (Part 9, pointed to from 4.1): the same question as Sales — already in `packets/spec.json`, Part 4 row 29.
- Dual submission (Medicare + MA): is the wording right? (item 34)
- Product guide: add any missing active models (your 4.10.2 item).
- When a PT or ATP evaluation is needed per insurance (your 4.1.1 item).
- The PT/OT referral point (your 4.3.2 item).
- Virtual ATP scheduling owner (your 4.6 item).
- Standard vs complex PWC definitions.

**After hours (Robin; Parth Shah; Shagun Shastri)**
- 8.4 timing between steps 1 and 2 (item 88).

---

## Appendix 1: Item by item

Numbers are list lines. Codes are defined at the top. Anything not noted is ✅.

### Front matter (2–8)

- **2** 🛠 "Start here" panel.
- **3** ✅ Delete the "Unified" title block. Classification moves to the footer. ❓ Keep Version/Built/Owner anywhere?
- **4**
  - ✏️ Removing "You are not expected to read this" leaves "It is a reference…" without a subject; reword.
  - ❓ Which when/use rows change, and to what?
  - ❓ New name for "Your first week" (suggest "Where to start").
  - ✅ "Formatted to be printed if desired."
  - ✅ Delete "roughly 25 pages".
- **5** ✏️ Also drops "they appear in every copy"; fine?
- **6** ✅ It also fixes "in the order an order travels", which is false today.
- **7** ✅ Real banner examples.
- **8** ✅

### Part 0 (16–36, 415)

- **16** ✏️ Drops "the tool flags it when tax applies"; OK? Align 1.1.2, 10.17 and the glossary.
- **17** see B-25 / A5.
- **18** ❓ Title (see A3).
- **19–21** ✅ (21: smooth the leftover sentence).
- **22** 🛠 Diagram edits:
  - Order Verification moved beside PAR, with a new PAR → Field Ops-Power arrow.
  - Text colours fixed.
  - "Running underneath" lane removed.
  - The caption changes too.
- **23** ❓ Means the stage table? I'd replace the text chain and the table with one ↓ step list. 0.8 currently shows the flow three times.
- **24** ❓ "UMS App".
- **25** 🖼 Screenshot. The current image is a diagram with section links; I'll keep those links in the text.
- **26** ✅ Also fix "dashboard" in 0.10.5.
- **27** 🖼 ❓ Above which Note?
- **28** ✅ Quote the app's exact template: Callback Number · Caller Name · Relationship · Patient & TRX · Issue · Transferred To · Resolution. 🖼/❓ Explanations from you, or I draft them for your review.
- **29** ❓ The examples are in 0.11.2 (subject lines). I'd make them a two-column table.
- **30–35** ✅ (34: keep the concrete examples).
- **36** ✏️
- **415** ❓ OBC content. It becomes a new 0.14, with a router row and a Card 0 line.

### Part 1 (37–66)

- **37** ❓ Which rows? The phrases double as search aliases, so they should be what callers actually say.
- **38** ✅ Add 0.2.2 and 4.7.1.
- **39** ✅
- **40** ⚠️ New policy. 6.3.2 and Card 6 change first.
- **41** ⚠️ B-17.
- **42–43** ✅ (43 matches 0.12.3).
- **44** ❓ Wording. Suggestion: "…requesting more information for a power chair authorization (PAR)", plus a non-power row.
- **45** 🛠 ❓ Do you write a "Do" for each row, or do I draft?
- **46** ✅ Merge the four repeats of the verification rule.
- **47–49** ✅
- **50** ⚠️ B-16, text ✅.
- **51–53** ✅ ("call back").
- **54** ✅
- **55** ❓ The 1.6 leads table is *generated* from the roster, so it carries no drift risk. Removing it loses the department → lead lookup. Recommend: keep the table and merge the section into 1.4.
- **56–59** ✅ (59: the "records at the physical facility" detail is true; dropping it is fine).
- **60** ✅ DECIDED: delete the field; "six" becomes "five" in 1.7.1, 1.7.3 and Card 1.
- **61** 🛠 Step style.
- **62** ✏️ Note that the template has no address or Medicare-number line, so those go in "Issue".
- **63** ✅ Router row "Do you speak Spanish? / ¿Habla español? / I need an interpreter → 1.8". (A plain "spanish" search already finds 1.8.1/1.8.2; this adds interpreter, translator and español.)
- **64** ✏️ B-24.
- **65** ✅ Put it in the 1.8 policy so it covers inbound too.
- **66** ✏️ Fold into "Reason for the call" ("— what needs to be discussed or completed").

### Part 2 (14–15, 67–95, 421)

- **14–15** ❓ MDS450EL.
- **67** ❓ Which less-obvious items? Candidates: neb refill supplies, scooters, POC, diabetic supplies, breast pumps.
- **68–69** ✅ (69: link the queue role).
- **70** ⚠️ B-10.
- **71** ✅
- **72** ✅ ⚠️ B-11.
- **73** ✅ The facts live on in 10.13.6. Keep the E0301 pre-delivery F2F line in 2.3.2.
- **74** 🛠 Spec cards (D7).
- **75** ✅
- **76** ❓ Boundary (A3).
- **77** 🖼
- **78** 🛠 Carousel, later.
- **79** ✅ Explain the rollator upgrade fee from 10.16, with no hard-coded dollars.
- **80** ✅
- **81** 🖼 ❓ $199/$200.
- **82** ✅ Into 10.11 as a note. Fix the 0.7.1 link.
- **83** 🖼 Needs the carousel or a second record.
- **84** ✏️ The coordinator needs an email in the roster.
- **85** ⚠️ Medicare covers a commode only when the patient is room-confined, so "can be suggested; still needs the referral".
- **86** ✅ Also shows in 10.16.
- **87** 🛠 Tint "Waived".
- **88** ✅ Also 10.16 and the packets.
- **89** ✅
- **90** ⚠️ Conflicts with the 93 rule; resolve together.
- **91** ❓ Boundary.
- **92** 🖼 URLs.
- **93** ⚠️ ❓ ABN.
- **94** ❓ New item: category, OOP price, photo.
- **95** ✅ Into 0.7.1 "Not covered anywhere", as a cross-department list.
- **421** 🖼 URLs. I'd add a link field per item so tutorials show in the item's row.

### Part 3 (9, 96–133)

- **9** ⚠️ POC (A3). The PAP → Service Q edit and "Medicare guidelines" are ✅. Briefs: ✏️ keep "(not a Medicare benefit)". Oxygen row deletion ✅.
- **96** ❓ What's wrong in the column?
- **97** ✅ Link the category-owner roles.
- **98** ⚠️ ❓ Fallback.
- **99** ❓ Title.
- **100–101** ✅ Also Appendix B's duplicate wording.
- **102** ❓ "Repeat Resupply".
- **103** ✅
- **104** ⚠️ B-12.
- **105** ✅
- **106** ✅
- **107** 🖼
- **108** ✅ DECIDED: move to 3.3.2.
- **109–110** ✅
- **111** ✅ Keep "5 mL" in the name.
- **112** ❓ Only 3.5.3, or everywhere allowances show?
- **113** ✅ The same repeat pattern is in 3.5.1, 3.9 and 2.8.4; fix all.
- **114** 🖼 Luna 30VT S/T.
- **115** ✅ Becomes a table caption.
- **116** ✅ Add to the Billing packet. The Resupply packet already has it.
- **117** 🛠 Footnotes.
- **118** 🖼 URL.
- **119** 🖼
- **120** ✅ The sentence is wrong anyway: there are 12 items, not 11.
- **121** ✅ 🛠
- **122** ✅ Stays a banner with the payer-split wording (A0 note 1).
- **123** ✅ Re-checked for 2026 (A0 note 1).
- **124** 🖼 or a generated size table.
- **125** ✏️ "routes via the Service Q; an RT performs the service".
- **126–127** ✅ DECIDED: create the ticket; Field Ops reviews. The equipment notes are reworded to match.
- **128–129** ❓ Definitions / source.
- **130** ✅ Already explained in 5.15; add the link.
- **131–132** ✅
- **133** 🖼 URLs.

### Part 4 (10–13, 134–193, 417)

- **10** ✅ Settled by A3.
- **11** ✅
- **12** 🛠 A6.
- **13** ✅ Also update 9.3 and the eligibility diagram bar.
- **134–135** 🛠 ✅ Diagram connectors.
- **136** ✅ Packet.
- **137** 🛠 ✅ Key (dashed and dotted).
- **138** ✅ Reverses the current stance; Card 4 and the packet change too.
- **139** 🖼 ❓ Is that sheet the app's InsurancePayors lookup? If so, link the Reference lookup.
- **140–142** ✅
- **143** ✏️ Drops "secures insurance approval"; OK?
- **144** ❓ Replace 4.3.1's line (recommended) and trim the duplicate in 4.3.2.
- **145** ⚠️ B-15.
- **146–148** ✅ (148: keep 4.5 row 5 consistent).
- **149** ❓ Sub-team role.
- **150–154** ✅
- **155** ❓ T3Q.
- **156–161** ✅
- **162** ❓ Remove (recommended).
- **163** ✅
- **164** ✅ Also move the delivery-route sentence out of this note.
- **165** ✅ It's already in the packet. ❓ Should Parth Shah be named on the Power packet?
- **166** ⚠️ B-4.
- **167–168** ✅
- **169** ❓
- **170** ✅ Full subject format.
- **171** ❓
- **172** ⚠️ ❓ Scenario.
- **173** ✅ Already in 10.8, so it's a delete from 4.
- **174** ✅ Diagram too.
- **175** ❓ Roster.
- **176–178** ✅
- **179** ✅ ⚠️ Also 5.4.4's heading, Card 4 and two packets. "Custodial nursing home that is the permanent residence" is right per CMS.
- **180–181** ✅
- **182** ✅
- **183** ⚠️ Conflicts with 5.9.1's absolute rule. ❓ Claim Prep.
- **184** ⚠️ B / Billing verify.
- **185** 🛠 🖼 Higher-resolution photos.
- **186** ✅ Rajdeep Thakar (Power Manager) is added as a Power packet reader for the product guide.
- **187** 🛠 The table is at the build's 6-column cap. Split it in two, as the scooter table is.
- **188–190** ✅
- **191** ✅ Align 4.9.1 and Card 4.
- **192** ❓ Replace with what? The content duplicates 4.9.
- **193** 🖼
- **417** ❓ A3.

### Part 9 → new Sales chapter (293–306, 418)

- **293–297** ✅ (293: also the banner title).
- **298** 🛠 ❓ Recommend one combined "Sales process + eligibility status" diagram.
- **299** ✅
- **300** ❓ Which note? 9.2's former watch-out #2, or 9.2.1's pair?
- **301–302** ✅
- **303** ❓ Content.
- **304–305** ✅
- **306** 🖼
- **418** A2.

### Part 5 (17, 194–233, 419, 424)

- **194** ✅ Also the roster notes.
- **195** ✅
- **196** ✏️ Say that the "Delivered" icon is the difference from the next row. Also 6.2's duplicate row.
- **197** ✅ Already in the packet.
- **198** ✅ Real tables fix the layout.
- **199–203** ✅ (#2 and #7 now overlap; I'll read them together).
- **204** ✅ Only 5.4.5 has no packet row.
- **205** ✅
- **206** ⚠️ B-3.
- **207** ⚠️ B-2.
- **208** 🛠 Footnote. ❓ Does Card 5 keep it?
- **209** ⚠️ B-19.
- **210–213** ✅
- **214** ✅ Fold into 5.6.1.
- **215** ✏️ It's a PHI document, so "email it to you securely".
- **216** ✅
- **217** ✅ Move into the 5.3 table.
- **218** ✅
- **219** ⚠️ B-21.
- **220** ❓ Merge the 5.9.2 and 5.9.3 watch-outs into one. Where should it sit?
- **221** ✅ Also 0.9.
- **222** ❓ Which sentence (probably "either supervisor decides")?
- **223–225** ✅
- **226–227** ✅ Shipped supplies "1–3 business days" is new content from you.
- **228** ✏️ B-23.
- **229** ❓ ⚠️ Process.
- **230–233** ✅ (232: point the new row at 5.6.1).
- **419** ❓
- **424** ❓ A3. The new home is a Billing subsection.

### Part 6 (234–259)

- **234** 🛠 Becomes a 3-column table (Situation | Owner | Go to). The current pairing implies false row-to-row links.
- **235** ❓ Police report?
- **236** ❓ New response?
- **237–239** ✅
- **240** ✅ DECIDED: delete (and its repeats in Card 6 and the packet).
- **241** ✅
- **242** ❓ $75 / $150.
- **243** ✅ Keep "say it before booking" inside the policy.
- **244–246** ✅ (246: 5.9.2 keeps the diagram; the router points there).
- **247** ❓
- **248** ✅
- **249** ✅ The approval path moves into 5.10; 6.9 becomes one line plus a link.
- **250** ✏️ "few" vs "three" elsewhere; pick one.
- **251** ✅
- **252** ❓ The heading only, or the whole banner? I'd keep "doesn't guarantee".
- **253–256** ✅
- **257** ✏️ Keep "if they report an issue, route to the Service Q".
- **258–259** ❓ ⚠️ B-20.

### Part 7 (260–274)

- **260** ✅
- **261** 🖼 The steps are actually in 7.2.2. Four screenshots exist (steps 1, 3, 4, 5) and get placed under their steps. Steps 2 and 6 need PHI-free screenshots.
- **262** ❓
- **263** 🖼 Nine items need photos. The carrier bag already has one in Part 2.
- **264** ✅ The banner is actually in 7.5.3.
- **265** ❓ Which watch-out: 7.5.3 conserver vs regulator (likely), or 7.4 humidifier?
- **266** ✅ This is the 7.6 table; real tables fix it.
- **267** 🛠
- **268** ⚠️ ❓
- **269** ❓ ⚠️
- **270** ✅ (A5). 7.9's unique content becomes Billing subsections. B-22.
- **271** ✅ Packet; also the Respiratory packet.
- **272** ✏️ "…within the per-delivery tank limits".
- **273** ❓ (A3) "Irving (DFW)".
- **274** 🖼

### Part 8 (275–292)

- **275** ✅ 3 columns.
- **276** ✅ Role link plus a pointer to 8.5.
- **277** ✅ Drop 8.1.3's duplicate row.
- **278** 🛠 ☐ checklist style.
- **279–280** ✅
- **281** ❓ The whole banner? It may fit 8.3 ("troubleshoot first") better.
- **282** ❓ Recommend one "For on-call technicians and RTs" section holding 284 and 287.
- **283** ✅
- **284** ⚠️ ❓ Vents.
- **285** ❓ Drop the 90-minute explanation? It changes with 286 anyway.
- **286** ❓ 🛠 Timings; diagram and Card 8 too.
- **287–288** ✅
- **289** 🛠 An on-call-only table: one row per person, grouped by location, without the daytime rows.
- **290** ✅
- **291** ⚠️ ❓
- **292** ❓

### Part 10 (307–357, 384, 408–411, 420)

- **307** ✅ Deleting both empties 10.1, so the section goes (A4).
- **308** ✅ Packet row too.
- **309** ❓ Drop the columns in all three billing tables? I'd also give the categories proper names ("Pwc" → "Power wheelchair").
- **310–311** ✅ (311: re-point the packet question to 7.5.3).
- **312–314** ✅ Labels "Part A — Hospital", "Part B — Medical (incl. DME)", and so on.
- **315–316** ⚠️ B-5, B-6.
- **317** ❓ I'd do a deductible-then-80/20 bar diagram.
- **318** ✅ DECIDED: Policy.
- **319–320** ✅ (320: all three rows are accurate; simplified into one).
- **321** ✏️ This watch-out is the only place "authorization *problems* → manager/supervisor" is said; keep that line somewhere.
- **322** ✏️ "may also reach out" (plans don't always notify approvals).
- **323** ⚠️ C.
- **324–326** ❓ ✅ (326: "some plans may…").
- **327–328** ✅
- **329** ✅
- **330–331** ✅ (10.13.2, typo) Billing becomes the O2 billing home; 7.8.1 points there.
- **332** ✅ Keep "(same calendar day each month as delivery)".
- **333** ❓ What to add?
- **334** ✅
- **335** ✅ The note is actually in 10.13.7.
- **336** ✅ Phase 3.
- **337** ✅
- **338** ✅ Lead with your sentence; trim the rest to a pointer to 5.9.4.
- **339** ✅ Phase 3.
- **340** 🛠 Columns: Payer | Item | Deductible | **Patient owes** | Why.
- **341–342** ✅ Denials Q ext 101, Monil Shah. ❓ backup / packet form (A1 item 12).
- **343** ✅ The definition is drafted for review; the word also goes into 10.19.
- **344** ✅
- **345** ✅ Also 0.10, Card 0 and 5.3.
- **346** 🖼
- **347** ❓ 10.20.4 is already a table; did you mean 10.20.3's six steps?
- **348** 🛠
- **349–353** ✅ (349: add "purchased items are owned on delivery; vents never").
- **354** ⚠️ B-8. Also fix the references in 1.3 and Card 0.
- **355** ❓ A3.
- **356** ✅ A Topic | Rule | Section table, merged with Card 10.
- **357** ✅
- **384** ✅ Lands in Phase 4 (the department name is part of the app's article grouping).
- **408** ✅ Phase 3 audit. Includes: Part 10 never mentions the PRF; 6.3.1 links "FSS items" to the wrong section.
- **409** ❓
- **410** ✅
- **411** ✅ COBRA and remittance added; EGHP and MSP already exist.
- **420** ❓ 🖼

### Appendices (358–383, 385–407)

- **358** ❓ What is the Upgrade Fee Sheet now that the manual publishes the fees itself?
- **359** ✅ Also add the rule to 0.11 so it applies to every department.
- **360** 🛠 B.1 layout.
- **361** ✅
- **362** ✅
- **363** ❓ A new Service Manager row, or rename the Supervisor? Merge the two duplicate Service team rows.
- **364** ✅
- **365** ✅ Rename the "Auth Escalation — MM" row to "Manual Mobility Manager" so three links keep working. ❓ "Same for (dept) Queue owner": just the MM queue, or all department queues?
- **366** ✅ Also the 2.8.1 "no backup" text and Card 2.
- **367** ✅ Packet too.
- **368** ✅ ❓ Confirm: Parth Shah as RT manager. Part 8 stresses he isn't respiratory-qualified for on-call.
- **369–372** ✅ The links in 4.3.3, 4.4.3, 4.5 and 4.5.2 get re-pointed. ❓ For 372: who now takes PT/OT office calls?
- **373** ❓ The Qualifications Team row, or the Qualifications Supervisor (Ahmed Ramadan)?
- **374–377** ✅ Power Manager = Rajdeep Thakar.
- **378** ✅ ❓ Does the general "Sales Queue" fold in too?
- **379** ✅
- **380** ✅
- **381** ✅ The entries exist (C).
- **382** ✅ Parth Shah will hold about 7 roles; surnames always show.
- **383** ✅
- **385–388** 🛠 Phase 5 (D4, D9).
- **389**
  - The "initial table" is the 0–9 bucket. It gets labelled.
  - **390–392** 🛠 Links, previews, HCPCS ↔ item cross-links.
  - **393** 🛠 A–Z rail.
  - **394** 🛠 Explanation column, abbreviations only.
  - **395/399/404/405** Fixed by A9.
  - **396/398/401/402/407** Curated exclusions.
  - **397** ✅ "Inbound".
  - **400** ✅ De-duplication.
  - **403** ✅ Note update types added from 0.11.2.
  - **406** ✅ Once NU/RR are written.

### Sweeps (412–414, 416, 422–425)

- **412** ✅ Phase 7.
- **413** ✏️ B-18.
- **414** 🛠 D5.
- **416** 🛠 D4.
- **422** 🛠 A7.
- **423** ✅ Phase 7, after footnotes exist.
- **424** see 5.
- **425** ✅ Phase 7 audit.

---

## Appendix 2: Images and URLs I'll need

### Photos

- bariatric walker
- crutches
- commode-opening sling
- heel protector (E0191)
- the five nebulizer supplies
- Luna G3 30VT S/T
- heated PAP tubing
- nine oxygen items: M6, E cylinder, cannula, 25/50 ft tubing, two connectors, humidifier bottle, cylinder stand
- (not listed by you) bariatric bed, tracheal suction catheter tray
- higher-resolution originals of the existing photos, if "bigger" is wanted
- MDS700EL: possibly reuse the Medline battery lift photo

### Screenshots (redacted)

- annotated Transaction page (0.10)
- full transaction icon string (0.10)
- O2 ticket steps 2 and 6 (7.2.2)
- example invoice (10.20.2) and the 8 payment-screen figures
- NU / RR examples
- Claim Prep tab
- delivery ticket and pick-up ticket creation (5.6 / 5.9.4 placeholders)
- optional brief sizing chart

### URLs

- 2.12: Rollator assembly video, PureSpeed knee brace tutorial, Upgrade Fee Sheet
- 3.7.3: ResMed Mask Selector
- 3.14: additional resources
- 4.12 / 4.2: Payor/HCPCS Order Acceptance sheet
- 5.17: Pick-up ticket tutorial
- 6.16: CPAP FAQ, suction setup
- 7.11: Oxygen instructions handout
- 9.8: Lead Resolutions tutorial
- 8.x and 0.x if any
