# Scoping: Spanish-inbox resolution tracking

Status: **proposal / awaiting operator decisions** (no code yet). Captures the
approach, the decisions needed, and a proposed v1 so we can build the right
thing once the questions below are answered.

## Goal
Track how long it takes for "I need a Spanish translator for this call/task"
emails (sent to a shared inbox you manage) to be **handled by a bilingual team
member**, and aggregate **average resolution time** + a **pending/open** count.

## Feasibility
Yes — buildable inside the existing deployed Apps Script web app, no new
infrastructure:
- The app already runs as the **deploying account** (`USER_DEPLOYING`). If that
  account can read the inbox (it owns it, it's a delegated/shared mailbox, or
  the requests carry a **Gmail label** the account can see), Apps Script's
  `GmailApp` / the advanced **Gmail API** can scan threads.
- A daily/periodic **time-based trigger** (the pattern the digests already use)
  scans matching threads, computes per-thread resolution time, and writes a
  PHI-free summary row to a tracking sheet.
- A **manager-gated Metrics sub-tab** (or a card) renders avg resolution time,
  median, count resolved, and current pending — reusing `mtRenderTable_` and the
  existing sparkline/telemetry components.

This is the same shape as the CDR/Metrics module: an isolated data layer
(`getSpanishInboxThreads_()`) behind a manager-gated endpoint, so the source
(Gmail today, something else later) is swappable.

## Decisions needed (the scoping questions)
1. **Which mailbox + how is it accessed?**
   - Is it the deploying account's own inbox, a **shared/delegated mailbox**, or
     a distribution address? (Determines whether `GmailApp` can see it as-is or
     needs the Gmail API + delegation, plus an added OAuth scope.)
2. **What identifies a "Spanish request" thread?** Options (pick one or combine):
   - a **Gmail label** applied to the request (cleanest + most reliable — e.g.
     `Spanish-Request`),
   - a **dedicated recipient address** (e.g. `spanish-help@…`),
   - a **subject/keyword** pattern (least reliable; misses/over-matches).
3. **What counts as "resolved"?**
   - **First reply from a bilingual team member** (we'd need the list of
     bilingual members' emails to detect "a reply from one of them"), OR
   - a **label change** (`Resolved` / archived / removed from an `Open` label) —
     simplest + unambiguous if the team already triages with labels, OR
   - **first reply by anyone other than the requester** (loosest).
4. **What's the clock?** Resolution time = first inbound request message →
   first qualifying reply. Business-hours-only or wall-clock? (We can subtract
   nights/weekends like the Coverage planner if you want SLA-style numbers.)
5. **Reporting window + grouping:** rolling 30/90 days? per-week trend? per
   requesting-rep breakdown? overall only?
6. **Privacy:** these are internal assistance requests, but may reference a
   patient/call. The tracker should store **metadata only** (thread id,
   timestamps, resolver, durations) — **never the email body/subject** — same
   PHI-minimization discipline as the AuditLog rows. Confirm that's acceptable.

## Proposed v1 (pending the above)
- **Identify** requests by a Gmail **label** (decision #2 → label) — robust and
  lets you control what's tracked without code.
- **Resolved** = first reply from a **bilingual-members allowlist** (decision #3
  → a small Script Property list of bilingual emails), falling back to "first
  reply by a non-requester" if the allowlist is empty.
- **Trigger:** hourly scan of the label's threads; compute per-thread
  first-request→first-qualifying-reply; write/update a PHI-free row in a
  `SpanishInbox` tab of a dedicated tracking sheet (Script Property
  `SPANISH_INBOX_SS_ID`, no fallback — same posture as `HR_DOCS_SS_ID`).
- **Surface:** a manager-gated Metrics card/sub-tab: avg + median resolution
  time, # resolved (window), # still pending (oldest first), and a weekly trend.
- **Scopes/state to add:** Gmail OAuth scope; `SPANISH_INBOX_SS_ID` +
  `SPANISH_INBOX_LABEL` + `SPANISH_BILINGUAL_EMAILS` Script Properties; one new
  trigger in `installAutomationTriggers`.

## Phasing
- **Phase 1:** label-based detection + resolution-time aggregate + manager card
  (the v1 above).
- **Phase 2 (optional):** per-requester breakdown, business-hours SLA, pending
  nudges to bilingual members (reusing the digest pattern).

## Out of scope / cautions
- Not a mailbox client — read-only metrics; the app never sends/auto-replies.
- Gmail scopes broaden the app's OAuth surface; the deploying account will
  re-authorize once (same as the Docs/Forms scope additions).
- If the mailbox can't be made visible to the deploying account (admin policy),
  this is blocked the same way the external-form route is — flag early.

---
*Answer the six decisions above (especially #1–#3) and I'll build the v1.*
