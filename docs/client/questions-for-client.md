# Questions for the client

Briefing call with ASPRI-IPI · Problem Statement #5, the team's first choice (the allocation is announced on 26 Oct 2026) · the week of 2 Nov 2026 (W3) · v0.4, 24 Oct 2026.

Questions Q-01 to Q-63 were written for the earlier statements. The ones that still apply keep their ids and are reworded for ASPRI-IPI; the rest are in the tag `archive/ps7-lesso-solar`. Ids are never reused, so the new questions start at Q-64.

## Three items to request first

We ask for these three sample packs as soon as the call is booked, so the session can work through real structures. Each pack is structure and dummy or anonymised rows only, never real trainee data, and it comes through the team's data folder, never into this public repository ([handling confidential material](#handling-confidential-material)).

| Pack  | What we ask for                                                                                                                                                                      | What it unblocks                                                                            | Questions it answers |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------- |
| **A** | The checklists of two or three courses (for example one WSQ course, one MOM-regulated course and one ITE course), with their criteria, critical items and how the outcome is decided | The rules model, the competency calculation and the tablet checklist (capabilities C and D) | Q-72, Q-73, Q-75     |
| **B** | A TMS export of courses, runs, trainees and results (headers and a few dummy rows), and any field dictionary                                                                         | The TMS connector, the master data and the way results go back (capabilities A and B)       | Q-64, Q-65, Q-68     |
| **C** | One submission example per agency (MOM AMS, SSG/WSDA and ITE STEP), with the portal's validation rules or an example of its error report                                             | The agency connectors and the submission files (capabilities A and D)                       | Q-66, Q-67, Q-69     |

## Agenda (60 minutes)

1. **Introductions and goal (10 min):** confirm our reading of Problem Statement #5 and what a useful PoC means to you.
2. **Questions (35 min):** the P1 questions below, topic by topic; P2 and P3 follow in writing if time runs out.
3. **Prototype and next steps (15 min):** a short walkthrough ([what we will show](#what-we-will-show)), then agree samples, contacts and the feedback cadence.

## How to use this list

All we know about ASPRI-IPI's systems comes from the brief; everything else is an assumption logged in [../assumptions.md](../assumptions.md). Each question replaces an assumption with a fact or unblocks a design decision.

| Priority | Meaning                          | When we ask                                                                 |
| -------- | -------------------------------- | --------------------------------------------------------------------------- |
| **P1**   | Must know before the W5 proposal | In the meeting                                                              |
| **P2**   | Must know before the W8 build    | In the meeting if time allows; otherwise in writing within two working days |
| **P3**   | Nice to have                     | In writing                                                                  |

- **Why we ask** names the assumption (A-xx) or design decision the answer unblocks. Capabilities A to G are listed in [../problem-statement.md](../problem-statement.md#25-scope).
- **Who** is our guess at who can answer best, so IT and compliance questions are forwarded rather than guessed.
- **Answer** is filled in during the meeting and checked against the minutes afterwards.
- **Roles:** Richie facilitates; one teammate keeps time and another takes notes. Each owner leads the questions for their area: the TMS and the agencies' channels (area 1, Richie); tablets, capture and verification (area 2, Azri); course rules and submission files (area 3, Iok Teck); PDPA, records and the AI policy (area 4, Angelyn).

**If we only get 15 minutes,** ask Q-64, Q-66, Q-69, Q-72, Q-74, Q-76 and Q-62.

| #   | Topic                                                        | Questions                      | P1     | P2     | P3    |
| --- | ------------------------------------------------------------ | ------------------------------ | ------ | ------ | ----- |
| 1   | [The TMS](#1-the-tms)                                        | Q-64, Q-65                     | 1      | 1      | 0     |
| 2   | [The agencies](#2-the-agencies)                              | Q-66, Q-67, Q-77               | 2      | 1      | 0     |
| 3   | [Trainee identity](#3-trainee-identity)                      | Q-68, Q-69                     | 2      | 0      | 0     |
| 4   | [Course rules](#4-course-rules)                              | Q-72, Q-73, Q-75               | 1      | 2      | 0     |
| 5   | [Tablets and connectivity](#5-tablets-and-connectivity)      | Q-70, Q-71                     | 2      | 0      | 0     |
| 6   | [Verification and users](#6-verification-and-users)          | Q-74, Q-81                     | 1      | 1      | 0     |
| 7   | [Baselines and success](#7-baselines-and-success)            | Q-76, Q-47, Q-49               | 2      | 0      | 1     |
| 8   | [PDPA, records and AI policy](#8-pdpa-records-and-ai-policy) | Q-40, Q-41, Q-42, Q-78, Q-79   | 0      | 5      | 0     |
| 9   | [Staff sign-in](#9-staff-sign-in)                            | Q-44, Q-45, Q-46               | 0      | 2      | 1     |
| 10  | [Logistics](#10-logistics)                                   | Q-50 to Q-56, Q-62, Q-63, Q-80 | 5      | 4      | 1     |
|     | **Total**                                                    | **35**                         | **16** | **16** | **3** |

## Questions

### 1. The TMS

| ID   | Pri. | Question                                                                                                                                                                                                                                        | Why we ask                                                                                                        | Who            | Answer |
| ---- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| Q-64 | P1   | Which Training Management System do you use (product and version, or built in-house), and who supports it? Does it offer an API, scheduled exports, or an import for results? How do staff enter results into it today?                         | The TMS connector, and whether verified results can go back without re-typing (capability A); tests A-64 and A-50 | Operations, IT |        |
| Q-65 | P2   | Which fields describe a course, a run, a trainee and a result in the TMS, and which codes does it use (course codes, outcome codes, dates)? Could you share a field dictionary? How late can a run's trainee list change before the assessment? | The master data and the mapping of TMS exports (capabilities A and B); tests A-64, A-34 and A-50                  | IT             |        |

### 2. The agencies

| ID   | Pri. | Question                                                                                                                                                                                            | Why we ask                                                                                                          | Who        | Answer |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| Q-66 | P1   | For each of MOM (AMS), SSG/WSDA and ITE (STEP): do you submit results through an API or by uploading a file to the portal? If a file, in which format; if an API, how is a submission acknowledged? | One connector per agency, by API or by delivered file (capability A); tests A-65                                    | Operations |        |
| Q-67 | P1   | Could you share one submission example per agency (headers and a dummy row), with the portal's validation rules or an example of its error report?                                                  | The submission files rendered from templates, and each agency's field allowlist (capability D); tests A-66 and A-81 | Operations |        |
| Q-77 | P2   | Who submits to each portal today? Does each agency set a deadline for results (for example a number of days after the assessment), and what happens when a submission is late or rejected?          | SLA reminders and the rework path (capability C); tests A-77 and A-83                                               | Operations |        |

### 3. Trainee identity

| ID   | Pri. | Question                                                                                                                                                                                              | Why we ask                                                                            | Who                    | Answer |
| ---- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- | ------ |
| Q-68 | P1   | How does the TMS identify a trainee: an internal learner ID, an NRIC or FIN number, or both?                                                                                                          | The match key across the tablets, the TMS and the agencies (capability B); tests A-68 | IT, operations         |        |
| Q-69 | P1   | Which identifier does each agency require in a submission? If NRIC or FIN numbers must be submitted, could they be added from the TMS at the moment of submission, so that HuiTong never stores them? | Whether national ID numbers ever touch HuiTong (CLAUDE.md data rules); tests A-69     | Operations, compliance |        |

### 4. Course rules

| ID   | Pri. | Question                                                                                                                                                                          | Why we ask                                                                            | Who                           | Answer |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| Q-72 | P1   | Could you share the checklists of two or three courses (one WSQ, one MOM-regulated and one ITE, if possible), with their criteria, critical items and how the outcome is decided? | The rules model and the competency calculation (capability D); tests A-70 and A-72    | Training managers             |        |
| Q-73 | P2   | How many criteria does a typical checklist have, how many trainees does a run assess, and how many assessors watch one run?                                                       | Volumes, and how much a tablet keeps offline per run; tests A-71                      | Training managers, operations |        |
| Q-75 | P2   | Who approves a course's assessment rules, how often do they change, and how is a change made today? Should a run in progress keep the rules it started with?                      | Rule versions and the approval of AI-drafted rules (capabilities D and E); tests A-75 | Training managers             |        |

### 5. Tablets and connectivity

| ID   | Pri. | Question                                                                                                                                                                          | Why we ask                                                                                         | Who                   | Answer |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| Q-70 | P1   | Do assessors have tablets today? Which make and model, shared or personal, and managed by IT? Which browsers do operations staff and management use on their desktops?            | The tablet checklist and its offline design (capability C); tests A-67, A-51 and A-82              | IT, operations        |        |
| Q-71 | P1   | Where in the training environments does the network drop, and for how long? Are there rules on devices in those areas, for example intrinsically safe devices in hazardous zones? | How long the checklist must work offline, and which devices are allowed; tests A-67, A-51 and A-82 | IT, training managers |        |

### 6. Verification and users

| ID   | Pri. | Question                                                                                                                                                                                     | Why we ask                                                                                            | Who                    | Answer |
| ---- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| Q-74 | P1   | Who verifies results today, what do they check, and how long does it take per run? What happens when a result is corrected after it has been entered into the TMS or submitted to an agency? | The run's lifecycle, the verification queue and corrections (capability C); tests A-73, A-74 and A-83 | Operations             |        |
| Q-81 | P2   | Who would use HuiTong, and roughly how many people in each job? Does anyone do two jobs, for example an assessor who also verifies or submits?                                               | The six roles and what each may see and do (CLAUDE.md section 4); tests A-78 and A-83                 | Management, operations |        |

### 7. Baselines and success

| ID   | Pri. | Question                                                                                                                                                                                                                                              | Why we ask                                                                                                                                | Who                    | Answer |
| ---- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| Q-76 | P1   | Roughly, today: how long consolidation and TMS entry take per run, how long a submission takes per agency, how often a submission is rejected or a result reworked, and how long a trainee waits from the assessment to certification?                | Replaces the assumed baselines in the success metrics ([../problem-statement.md](../problem-statement.md#26-success-metrics)); tests A-76 | Operations, management |        |
| Q-47 | P1   | Which three outcomes matter most to you, and how will you judge the PoC at the end of the semester? Of capture on tablets, the competency rules, the TMS output and the agency submissions, which comes first? Which acceptance tests should it pass? | Prioritises the build and validates the [hero journey](../agile/hero-journey.md)                                                          | Management             |        |
| Q-49 | P3   | Would you consider a pilot after the semester, and what would you need to see first?                                                                                                                                                                  | The roadmap after the W19 check-in                                                                                                        | Management             |        |

### 8. PDPA, records and AI policy

| ID   | Pri. | Question                                                                                                                                                                                      | Why we ask                                                                                                                     | Who                    | Answer |
| ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------ |
| Q-40 | P2   | Who is ASPRI-IPI's DPO, and may we consult them on our GRS design?                                                                                                                            | A reviewer for [../grs/grs-by-design.md](../grs/grs-by-design.md); tests A-79 and A-30                                         | Compliance             |        |
| Q-41 | P2   | Do you have a data classification scheme and a retention schedule for training and assessment records?                                                                                        | Aligns our four levels (PUBLIC to RESTRICTED) and retention settings with yours instead of inventing them; tests A-28 and A-80 | Compliance, IT         |        |
| Q-42 | P2   | Is there an AI policy? Which AI providers and hosting regions are approved, and may an AI service see a course's assessment plan, column headers and the distinct codes of a category column? | The rule-drafting and mapping assistants (mock provider by default, AWS Bedrock optional); tests A-17                          | Compliance, IT         |        |
| Q-78 | P2   | What are trainees told when they enrol about how their results and personal data are used and shared with the agencies?                                                                       | The purpose recorded in each agency's allowlist entry; tests A-79 and A-81                                                     | Compliance             |        |
| Q-79 | P2   | How long must assessment records be kept, and in what form does an agency check them (for example an audit visit)?                                                                            | Retention settings and the evidence the audit trail must give (capability F); tests A-80                                       | Compliance, operations |        |

These questions ask about design inputs, not for legal advice; the compliance context is in [../problem-statement.md](../problem-statement.md#24-constraints).

### 9. Staff sign-in

| ID   | Pri. | Question                                                                                            | Why we ask                                                                                | Who            | Answer |
| ---- | ---- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------- | ------ |
| Q-44 | P2   | Which identity provider do staff sign in with (for example Microsoft Entra ID or Google Workspace)? | Production SSO design (the PoC uses local demo accounts); tests A-16                      | IT             |        |
| Q-45 | P2   | Is multi-factor authentication required for staff systems and administrator accounts?               | Production authentication design, and alignment with your IT security policy; tests A-16  | IT             |        |
| Q-46 | P3   | Could HuiTong roles come from directory groups, and who approves role changes?                      | RBAC administration, and joiner-mover-leaver handling for HuiTong's own users; tests A-16 | IT, operations |        |

### 10. Logistics

| ID   | Pri. | Question                                                                                                                                                      | Why we ask                                                                                                               | Who                        | Answer |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ------ |
| Q-50 | P1   | Could you share structure-only samples (checklists, TMS export headers, submission templates, a few dummy rows) instead of real data?                         | Our synthetic data can then match real structures without any personal data; tests A-31 and A-42                         | Operations, IT             |        |
| Q-51 | P1   | Who are our subject-matter experts (an assessor, an operations executive, a training manager and IT), and how should we reach them?                           | Unblocks questions during the build; tests A-42                                                                          | Management                 |        |
| Q-52 | P1   | What feedback cadence suits you (for example 30 minutes every two weeks), and who should attend?                                                              | Plans reviews before W5, W13 and W18; tests A-42                                                                         | Management                 |        |
| Q-53 | P1   | What confidentiality terms apply (an NDA, your document classifications)? The brief names ASPRI-IPI: may we name you in our presentations too?                | How we handle your material and what our slides may show; using your brand in the prototype is Q-62; tests A-31 and A-43 | Management                 |        |
| Q-54 | P2   | Would your IT security team need to review the PoC before any connection to a test system, and what evidence would they want?                                 | Plans security evidence early (OWASP checklist, dependency audit, test results); tests A-49 and A-84                     | IT                         |        |
| Q-55 | P2   | Can we demonstrate on our own cloud deployment with synthetic data and clearly labelled mock versions of your systems, or must demos run inside your network? | Demo environment and deployment target; confirms that labelled mocks are acceptable; tests A-49 and A-84                 | IT                         |        |
| Q-56 | P3   | Who should attend the W18 final presentation and the W19 check-in, and which dates should we avoid (Chinese New Year falls on 6 February 2027)?               | Scheduling                                                                                                               | Management                 |        |
| Q-62 | P1   | May we use your brand (name, logo, colours) in the prototype and in our presentations, and on what terms?                                                     | Until you agree, the prototype carries no ASPRI-IPI logo, brand assets or theme; tests A-43                              | Management, communications |        |
| Q-63 | P2   | Could one or two assessors and an operations executive try the prototype for 30 minutes during the semester, and give us feedback?                            | Usability evidence for the W13 and W18 reviews (module requirement 1)                                                    | Management                 |        |
| Q-80 | P2   | Which languages do your staff prefer for the screens: English only, or also 中文 (or Malay or Tamil)?                                                         | The UI languages; tests A-46                                                                                             | Management                 |        |

## What we will show

A walkthrough of about 10 minutes at the end of the meeting. Each step ends with a question, so the demo tests our assumptions too. The screens for #5 are being built, so a step whose screen is not ready on the day shows its design instead, and says so.

| Step | Screen                                                 | What we show                                                                                                                                  | What we ask                                                                  |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | Overview                                               | The systems HuiTong connects (the TMS and the three agencies, each a labelled mock) and a run's status from capture to submission             | Is this what operations need to see first each morning?                      |
| 2    | Tablet checklist (prototype, area 2)                   | A run on a tablet: the checklist per trainee, the critical items, and a record that syncs after a dropped connection                          | How does this compare with your paper checklist in the training environment? |
| 3    | Competency and verification (prototype, areas 2 and 3) | The calculated outcome from the course's rules, the verification queue, and a correction with its reason                                      | Who checks what today, and what makes a result need correcting?              |
| 4    | Rules and mapping assistants (areas 1 and 3)           | The AI drafts a course's rules from its assessment plan, or a mapping of a TMS export, with confidence and rationale, for a person to approve | Would your training managers and IT accept this approval step?               |
| 5    | Submissions (prototype, areas 1 and 3)                 | One agency gets the results through its API and another through a file the portal mock validates                                              | Which agencies take a file today, and in what format?                        |
| 6    | Governance (prototype, area 4)                         | The audit trail of a result and its correction, and each agency's field allowlist                                                             | What would an agency's audit ask to see?                                     |

- Everything on screen is synthetic demo data from mocked systems, and every screen says so.
- The prototypes run on typed sample data; each area's owner builds the core logic later in the semester.

## Handling confidential material

- **Structure, not people.** We ask for checklists, headers, code lists, blank templates and dummy rows. Please do not send real trainee data. If real personal data reaches us by mistake, we stop using it, delete it and tell you the same day.
- **Where material lives.** Documents you share go to a private team folder that only the four team members and our NYP lecturers can open. Our repository is public, so it never holds your material: this file records only answers you are comfortable with us publishing, in our own words.
- **No onward sharing.** Material you mark confidential never appears in public slides, posts or demos, and we do not paste your documents into external services, including AI services, without your written approval.
- **Naming and brand.** Deliverables name you as ASPRI-IPI, as the brief does. Your logo, brand assets and colours stay out of the prototype until you agree (Q-62).
- **Minutes.** We send minutes for your corrections within two working days, and we record a meeting only with your consent.
- **End of project.** When the project ends, we delete or return your material unless you ask us to keep it.

## After the meeting

- Within two working days: send the minutes, copy the confirmed answers into this file, and send unanswered P2 and P3 questions in writing.
- Update [../assumptions.md](../assumptions.md): confirm, revise or retire every assumption the answers touch.
- Update the baselines in [../problem-statement.md](../problem-statement.md#26-success-metrics) and [../design-thinking/success-metrics.md](../design-thinking/success-metrics.md).
- Record any changed decision as an ADR ([../adr/README.md](../adr/README.md)), and replace mocks whose real contracts are now known.
