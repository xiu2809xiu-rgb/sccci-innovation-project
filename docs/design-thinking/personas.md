# Personas

HuiTong 汇通 · ASPRI-IPI · Problem Statement #5 (the team's first choice)

> **Status: Assumed.** These are **proto-personas**. We built them from the brief and desk research before the briefing call (the week of 2 Nov), and we have not yet met the people they describe ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)). Each one names the assumptions it rests on; the briefing call confirms or corrects them.

All the people here are synthetic. When the six #5 roles reach the code (prompt 005, step 5), they become HuiTong's seeded demo users, so a walkthrough or a prototype test can be run as the persona, with the matching role, from the demo role switcher.

**Contents:** [At a glance](#personas-at-a-glance) · [1. Hafiz Rahman](#1-hafiz-rahman-assessor) · [2. Joanne Lim](#2-joanne-lim-operations-executive) · [3. Priya Nair](#3-priya-nair-training-manager) · [4. Ronald Seah](#4-ronald-seah-head-of-training-operations) · [The trainee](#the-trainee-secondary-persona) · [Secondary roles](#secondary-roles) · [Accessibility across the personas](#accessibility-across-the-personas) · [Validation plan](#validation-plan) · [Change log](#change-log)

## Personas at a glance

|                                                             | Hafiz Rahman                                        | Joanne Lim                                              | Priya Nair                                                         | Ronald Seah                               |
| ----------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Role                                                        | Senior trainer and assessor                         | Operations executive                                    | Training manager                                                   | Head of training operations               |
| HuiTong role                                                | `ASSESSOR`                                          | `OPERATIONS`                                            | `TRAINING_MANAGER`                                                 | `MANAGEMENT`                              |
| Where they work                                             | Training plants and workshops, then a shared desk   | The operations office                                   | The office, and the training ground when a course changes          | The office                                |
| Device                                                      | A tablet during assessments; a desktop afterwards   | A desktop with two screens                              | A laptop                                                           | A laptop                                  |
| Journeys ([journey-maps.md](journey-maps.md))               | D (a run, from the training ground to the agencies) | D, and F (a rejected submission)                        | E (a course's rules change)                                        | D, for the status and the measures        |
| Biggest need                                                | Record each result once, while watching the trainee | Results that arrive verified-ready and leave first time | Rules applied the same way by every assessor, changed without code | One view of runs, results and submissions |
| Main screens                                                | The tablet checklist                                | The verification queue, the submissions board           | Course rules, the rule-drafting assistant                          | The overview and dashboards               |
| Success measures ([success-metrics.md](success-metrics.md)) | SM-12, SM-13, SM-19                                 | SM-15, SM-16, SM-17, SM-18                              | SM-14, SM-09                                                       | SM-12, SM-20, SM-08                       |

---

## 1. Hafiz Rahman, assessor

**Status: Assumed.** Rests on [A-67](../assumptions.md), [A-70](../assumptions.md), [A-71](../assumptions.md) and [A-82](../assumptions.md).

### Role and context

Hafiz, 52, ran process plant equipment for twenty years before he became a trainer and assessor. He assesses two or three runs a week, about a dozen trainees each, in process plant operations and workplace safety courses. He watches each trainee carry out practical tasks at a training plant or workshop, ticks a paper checklist on a clipboard, and afterwards works out each trainee's result from the criteria and types it into the TMS.

### Goals

- Watch the trainee, not the paperwork.
- Never miss a critical item, because a missed one makes the result wrong.
- Finish a run's paperwork before he leaves for the day.
- Give results he can defend if an agency or a trainee asks.

### Frustrations

- He ticks every criterion on paper, then types every tick into the TMS: about an hour a run.
- In gloves and safety gear, a clipboard and pen are awkward, and a page can get wet or smudged.
- Some parts of the training ground have no signal, so anything online is out of the question there.
- When operations find a mismatch, they call him days later, and he has to remember the run.

### Tools today

| Tool                                       | What he uses it for                        |
| ------------------------------------------ | ------------------------------------------ |
| Paper checklists, one per trainee          | Ticking criteria during the assessment     |
| A calculator, or the checklist's own tally | Working out Competent or Not Yet Competent |
| The TMS, on a shared desktop               | Typing the results in after the run        |
| Email and phone                            | Answering operations' questions            |

### A day in the life (assessment day)

He arrives at the training plant at 08:00 with twelve checklists. Through the morning he watches each trainee start up a pump, isolate a line, test the gas and fill in a permit, ticking criteria and noting the critical items. After lunch he tallies each trainee's result. At 16:00 he sits at a shared desktop and types twelve results into the TMS, criterion by criterion where the course asks for it. At 17:15 he notices he has ticked a criterion for the wrong trainee and starts that sheet again.

### Key quote (illustrative)

> "I've already ticked it once. Why am I typing it again at five o'clock?"

### What success looks like

- He records each result once, on a tablet, while he watches.
- The checklist won't let him finish a trainee with a critical item unmarked, and it works out the result for him.
- The run syncs when the tablet finds a signal, and he never types it again.

### Accessibility and language needs

- Gloves and safety gear: large touch targets (at least 44 px, as CLAUDE.md section 8 sets for the checklist) and no fiddly gestures.
- Bright light outdoors: high contrast, and nothing that depends on colour alone.
- Reading glasses: text that stays legible at 200% zoom.
- English is his working language.

### How HuiTong serves him

| Need                                                                             | Capability | Area |
| -------------------------------------------------------------------------------- | ---------- | ---- |
| A checklist on a tablet that works without a signal and syncs afterwards         | C          | 2    |
| Critical items he cannot skip, and the result calculated from the course's rules | D          | 3    |
| Results that reach the TMS without re-typing                                     | A, C       | 1, 2 |

### Assumptions to validate

- Assessors can use tablets during assessments, and some areas have no signal ([A-67](../assumptions.md); Q-70, Q-71).
- One assessor watches a run of about a dozen trainees, with 20 to 40 criteria a checklist ([A-71](../assumptions.md); Q-73).
- The checklist has criteria, critical items and an outcome rule ([A-70](../assumptions.md); Q-72).

---

## 2. Joanne Lim, operations executive

**Status: Assumed.** Rests on [A-65](../assumptions.md), [A-66](../assumptions.md), [A-73](../assumptions.md), [A-74](../assumptions.md) and [A-77](../assumptions.md).

### Role and context

Joanne, 34, is one of a small operations team. She checks the results assessors have typed into the TMS against their paper checklists, and, as we assume, submits them to MOM, SSG/WSDA and ITE, handles the submissions that come back and files the paper so it can be found when an agency checks.

### Goals

- Submissions accepted the first time, before each agency's deadline.
- Know where every run stands without asking.
- When an agency checks, find the evidence for any result quickly.

### Frustrations

- She needs the paper beside the screen to verify, and a mismatch means chasing an assessor.
- Three portals, three formats: the same results are keyed or uploaded again, agency by agency, and one portal takes only a file.
- A rejected row comes back days later, and fixing it means retracing the whole run.
- Paper filing takes time, and a misfiled sheet is hard to find when it is needed.

### Tools today

| Tool                              | What she uses it for                                          |
| --------------------------------- | ------------------------------------------------------------- |
| The TMS                           | Checking the results assessors typed in                       |
| Paper checklists                  | The evidence she checks against                               |
| The MOM, SSG/WSDA and ITE portals | Submitting results; reading rejections                        |
| Spreadsheets                      | Tracking which runs are submitted, and preparing upload files |
| Filing cabinets                   | Keeping the paper for audits                                  |

### A day in the life (the day after three runs)

She starts with three bundles of checklists and the TMS on her second screen. By 11:00 she has found two results typed under the wrong trainee and emailed the assessors. After lunch she submits one run to an agency's API through its portal, then builds an upload file for another agency's portal from a spreadsheet, column by column. At 16:30 an email says a file from last week had a rejected row; she pulls the paper from the cabinet to see what went wrong.

### Key quote (illustrative)

> "I'm not checking the results. I'm checking the typing."

### What success looks like

- A verification queue with the evidence beside each result, and a correction recorded with its reason.
- Verified results reach the TMS without re-typing.
- Each agency gets its results by API or as a file that is checked before it goes, and she sees each submission's status in one place.

### Accessibility and language needs

- Long hours with dense tables: clear focus states, keyboard shortcuts, and text that stays legible at 200% zoom.
- English is her working language.

### How HuiTong serves her

| Need                                                               | Capability | Area |
| ------------------------------------------------------------------ | ---------- | ---- |
| A verification queue, corrections with reasons, SLA reminders      | C          | 2    |
| Agency files rendered from templates and validated before delivery | D          | 3    |
| Delivery to each agency by API or file, with the status tracked    | A          | 1    |
| The audit trail of every result and correction                     | F          | 4    |

### Assumptions to validate

- Operations verify every result before it leaves ([A-74](../assumptions.md); Q-74).
- Each agency takes an API call or a file, with its own format and deadline ([A-65](../assumptions.md), [A-66](../assumptions.md), [A-77](../assumptions.md); Q-66, Q-67, Q-77).
- Operations, not assessors, submit to the portals ([A-83](../assumptions.md); Q-77).

---

## 3. Priya Nair, training manager

**Status: Assumed.** Rests on [A-70](../assumptions.md) and [A-75](../assumptions.md).

### Role and context

Priya, 45, manages a group of courses: WSQ courses, some of them regulated by MOM, and ITE courses. She owns each course's assessment plan and its criteria, keeps them in line with each agency's requirements, and briefs assessors when something changes.

### Goals

- Every assessor applies the rules the same way.
- A change to a course's rules reaches every run that should use it, and no run that shouldn't.
- Show an agency exactly which rules applied to any result.

### Frustrations

- The rules live in documents, and assessors interpret them differently.
- A change means updating the documents, printing new checklists and briefing everyone, and an old checklist can still turn up.
- Checking that assessors applied the rules consistently means sampling paper by hand.

### Tools today

| Tool                                        | What she uses it for                         |
| ------------------------------------------- | -------------------------------------------- |
| Assessment plans and checklists (documents) | Defining each course's criteria and outcomes |
| Email and briefings                         | Telling assessors about changes              |
| The TMS                                     | Course set-up                                |

### A day in the life (an agency updates a course's requirements)

An agency publishes a change to a course's requirements. Priya updates the assessment plan, rewrites the checklist and marks the new critical item. She emails the assessors, then prints new checklists. A week later she finds a run assessed on the old checklist and has to decide whether its results stand.

### Key quote (illustrative)

> "The rule is clear in the plan. It just isn't clear in twelve people's heads."

### What success looks like

- Each course's rules are versioned configuration, and a run keeps the version it started with.
- When a course is new or changes, the AI drafts its rules from the assessment plan; she corrects and approves them, and the next run uses them with no code change.
- She can see whether results are consistent across assessors.

### Accessibility and language needs

- Comfortable with documents and spreadsheets; needs the rule editor to read like the checklist, not like code.
- English is her working language.

### How HuiTong serves her

| Need                                                                    | Capability | Area                             |
| ----------------------------------------------------------------------- | ---------- | -------------------------------- |
| Course rules as versioned configuration; automatic competency           | D          | 3                                |
| A first draft of the rules from the assessment plan, which she approves | E          | 3, through area 1's `LlmGateway` |
| Consistency insights across assessors                                   | D          | 3                                |

### Assumptions to validate

- Training managers own and approve each course's rules ([A-75](../assumptions.md); Q-75).
- The rules have criteria, critical items and an outcome rule ([A-70](../assumptions.md); Q-72).
- The AI may read an assessment plan, which holds no personal data ([A-17](../assumptions.md); Q-42).

---

## 4. Ronald Seah, head of training operations

**Status: Assumed.** Rests on [A-76](../assumptions.md).

### Role and context

Ronald, 50, runs ASPRI-IPI's training operations. He is accountable for throughput, timely submissions and the cost of administration, and he sponsors the change from paper.

### Goals

- See runs, results and submissions in one place, with the backlog and any missed deadlines.
- Know what the change saves, measured, not estimated.
- Pass an agency's audit without a scramble.

### Frustrations

- Status comes from spreadsheets and from asking people, so problems show up late.
- The cost of the paperwork is known only roughly.

### Tools today

Reports from the TMS and spreadsheets the operations team keeps.

### What success looks like

- A dashboard of runs by stage, submissions by agency, deadlines and rejections.
- The post-assessment hours per run, before and after, measured by the product.

### How HuiTong serves him

| Need                                                  | Capability | Area |
| ----------------------------------------------------- | ---------- | ---- |
| Dashboards and insights for management and operations | D          | 3    |
| Measured effort per run, and AI cost                  | D, G       | 3, 4 |

### Assumptions to validate

- Today's baselines are the brief's: about an hour of consolidation and TMS entry per run ([A-76](../assumptions.md); Q-76).
- Management wants the status and the measures, read-only (Q-47).

---

## The trainee (secondary persona)

**Tan Wei Jie**, 24, is training as a process technician. He is assessed on the training ground and waits for his result to reach the agency before he is certified. He never uses HuiTong, but its errors and delays land on him.

- **Needs:** an accurate result, recorded once; certification without delay; his personal data shared only as each agency requires.
- **Design response:** results verified before they leave (capability C), each agency's field allowlist (capability F), and no national ID numbers stored ([A-69](../assumptions.md)).

## Secondary roles

These roles appear in the journeys but do not need full personas this semester.

| Person (demo user)                   | HuiTong role    | What they need                                                                                         |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------ |
| Grace Lim                            | `AUDITOR`       | A tamper-evident trail of every result, correction and submission, read-only, with exportable evidence |
| Farhan Ismail                        | `SYSTEM_ADMIN`  | Connector set-up and health, users and roles, platform configuration                                   |
| Agency officers (MOM, SSG/WSDA, ITE) | None; mocked    | Complete, valid submissions in their own format, with only the fields they require                     |
| Compliance team and DPO              | None in the PoC | Purposes and allowlist entries per agency, retention settings, evidence for a breach assessment        |

**Not designing for this semester:** trainees as users (they never sign in), course scheduling and enrolment (the TMS does it), and course funding or fee claims.

## Accessibility across the personas

None of the proto-personas is defined by a disability, but any of them may use a screen magnifier, the keyboard alone, a screen reader or reduced motion, permanently or for a while. HuiTong targets WCAG 2.2 AA. These criteria matter most for these users:

| Criterion                                                             | Where it matters                            | Design response                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1.4.3 Contrast (minimum); 1.4.11 Non-text contrast                    | The checklist outdoors (Hafiz)              | Colour tokens checked at 4.5:1 for text and 3:1 for controls; nothing told by colour alone |
| 1.4.4 Resize text                                                     | The checklist and the queue                 | Layouts that hold at 200% zoom                                                             |
| 2.4.7 Focus visible                                                   | The verification queue (Joanne)             | Visible focus rings                                                                        |
| 2.5.8 Target size (minimum)                                           | The checklist in gloves                     | Targets of at least 44 px on the checklist, above the 24 px minimum                        |
| 4.1.3 Status messages                                                 | Offline and sync state on the tablet        | The sync status announced without moving focus                                             |
| 3.3.7 Redundant entry                                                 | A result after the assessment               | A result recorded once reaches the TMS and the agencies; nothing is asked for twice        |
| 3.3.8 Accessible authentication (minimum)                             | Sign-in on a shared tablet                  | Password managers and paste allowed; no puzzles                                            |
| Project rule: reduced motion ([CLAUDE.md](../../CLAUDE.md) section 8) | Overview animations, the 3D integration map | `prefers-reduced-motion` honoured everywhere; a static frame replaces the 3D animation     |

Evidence is collected by the accessibility guardrail GR-07 in [success-metrics.md](success-metrics.md#guardrails).

## Validation plan

| Persona      | Riskiest assumptions                                                                                  | How we test them                                                                                                                         | Questions              |
| ------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Hafiz Rahman | Tablets are usable during assessments; some areas have no signal; re-typing takes about an hour a run | Interview and a walkthrough of a sample checklist at the briefing call; a prototype test of the tablet checklist with an assessor (Q-63) | Q-70, Q-71, Q-72, Q-76 |
| Joanne Lim   | Operations verify every result and submit to each portal; rejections come back late                   | Walkthrough of one run from the TMS to a submission, with dummy values                                                                   | Q-66, Q-67, Q-74, Q-77 |
| Priya Nair   | Training managers own the rules, and the rules have criteria, critical items and an outcome rule      | Review of two or three sample checklists with a training manager                                                                         | Q-72, Q-75             |
| Ronald Seah  | Management needs the status and measured effort                                                       | Ask how they will judge the PoC                                                                                                          | Q-47, Q-76             |

- **Proxy users.** Where client staff cannot join a prototype test, people briefed on a persona stand in for them, and their results are labelled as proxy results.
- **After the briefing call.** Within two working days, each persona's label moves from Assumed to Partly validated or Validated (definitions in [README.md](README.md)), and the matching assumptions are updated in [../assumptions.md](../assumptions.md).

## Change log

| Date                  | Week | Change                                                                                                                                                                                                                           |
| --------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20 to 22 October 2026 | W1   | Personas for the earlier statements; they are kept in the tag `archive/ps7-lesso-solar`                                                                                                                                          |
| 24 October 2026       | W1   | Retargeted to statement #5, ASPRI-IPI ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)): an assessor, an operations executive, a training manager and the head of training operations, with the trainee as a secondary persona |
