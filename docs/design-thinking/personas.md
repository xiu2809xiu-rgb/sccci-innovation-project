# Personas

HuiTong 汇通 · LESSO Solar · Problem Statement #7

> **Status: Assumed.** These are **proto-personas**. We built them from the brief and desk research before the briefing call (the week of 2 Nov), and we have not yet met the people they describe. They first described Problem Statement #17 and moved to LESSO Solar's context on 22 October 2026 ([ADR 0022](../adr/0022-final-statement-7-lesso-solar.md)). Roles, tools and habits are hypotheses to validate with LESSO Solar, and every quote is illustrative. Assumptions are logged in [../assumptions.md](../assumptions.md) (A-xx) and tested by the questions in [../client/questions-for-client.md](../client/questions-for-client.md) (Q-xx). Labels follow [README.md](README.md).

All three people are synthetic. They are also HuiTong's seeded demo users, so a walkthrough or a prototype test can be run as the persona, with the matching role, from the demo role switcher.

**Contents:** [At a glance](#personas-at-a-glance) · [1. Tan Mei Ling](#1-tan-mei-ling-sg-hr-executive) · [2. Zhou Xinyi](#2-zhou-xinyi-china-hq-hr-partner) · [3. Arjun Menon](#3-arjun-menon-hiring-manager) · [Secondary roles](#secondary-roles) · [Accessibility across the personas](#accessibility-across-the-personas) · [Validation plan](#validation-plan)

## Personas at a glance

|                                                             | Tan Mei Ling                                                              | Zhou Xinyi 周欣怡                                                    | Arjun Menon                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Role                                                        | SG HR executive                                                           | China HQ HR partner                                                  | Hiring manager, Head of Regional Sales                             |
| Entity                                                      | `SG01`, the Singapore hub                                                 | `CN01`, China HQ                                                     | `SG01`, the Singapore hub                                          |
| HuiTong role                                                | `HR_SG`                                                                   | `HR_HQ`                                                              | `HIRING_MANAGER`                                                   |
| Working language                                            | English                                                                   | 简体中文 (reads English well)                                        | English                                                            |
| Journeys ([journey-maps.md](journey-maps.md))               | All three: onboarding, the monthly summary, and claims she is asked about | Onboarding (the SAP record) and the monthly summary, for the HQ side | Onboarding his hires; his team's claims                            |
| Biggest need                                                | Enter a new hire once, in the right order, and close the month quickly    | Singapore hires in SAP's structure, and only the fields HQ may hold  | Know where a hire or a claim stands, and a new hire ready on day 1 |
| Main screens                                                | Overview, Employees, Workflows, Attendance and leave                      | Employees, Workflows, Governance, AI mapping wizard                  | Workflows, Overview                                                |
| Success measures ([success-metrics.md](success-metrics.md)) | SM-01, SM-02, SM-05, SM-07                                                | SM-02, SM-06, SM-10, GR-03                                           | SM-03, SM-04, SM-11                                                |

---

## 1. Tan Mei Ling, SG HR executive

Tan Mei Ling · `HR_SG` · the Singapore hub (`SG01`)

### Role and context

- HR executive in a small HR team at LESSO Solar's Singapore hub (assumed three people). Reports to the Head of HR, Singapore, who is the data owner for SG01 ([GRS 2.1](../grs/grs-by-design.md#21-roles-and-responsibilities)).
- Looks after records, leave and payroll inputs for about 50 SG01 employees (A-11: we model about 50 SG01 and 70 CN01 employees) in INFO-TECH.
- Every new hire passes through her three times: into INFO-TECH, to HQ for the SAP record, and to IT for intranet access once the SAP record exists (A-62).
- Prepares the monthly leave and payroll summary for management, and is the person colleagues ask when a claim is stuck at HQ.
- Works in English. Speaks Mandarin socially but reads formal Chinese HR terms slowly, so HQ files with Chinese headers cost her time (assumed).

### Goals

- Enter each new hire once, and trust that SAP, INFO-TECH and the intranet follow in the right order.
- Keep INFO-TECH, SAP and HuiTong's master in step without reconciling spreadsheets.
- Close the monthly summary quickly and get it right first time.
- See every new hire ready on day 1, intranet account included.
- Spend her time on people rather than on carrying data between systems.

### Frustrations

- Typing the same new hire into INFO-TECH, into a spreadsheet for HQ, and into an access request for IT.
- Waiting for HQ to create the SAP record before she can even ask for intranet access, while the start date gets closer.
- Reformatting HQ files: Chinese headers, `YYYY/MM/DD` dates, SAP codes and CSV text that opens garbled because it was saved as GBK.
- Being asked where a claim is when it is waiting for HQ Treasury, in a step she cannot see.
- Emailing files that contain salary and bank columns, with no record of what went where.
- The month-end crunch: about 16 hours of preparing the summary while management waits (A-12: assumed baselines).

### Tools today

| Tool                                      | What she uses it for                                                                                      | How often                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| INFO-TECH                                 | Employee records, leave and payroll inputs                                                                | Daily                        |
| HQ intranet                               | News, policies, her own claims and approvals                                                              | Daily                        |
| Excel                                     | The onboarding tracker; spreadsheets for HQ; the monthly summary workbook; the company reporting template | Daily, heaviest at month-end |
| Email                                     | Files to and from HQ, IT, admin and management                                                            | Daily                        |
| Chat (Lark, WeChat or another tool, Q-61) | Hiring managers, admin, IT and HQ colleagues                                                              | All day                      |
| HQ SAP                                    | No access (assumed); HQ confirms SAP records by email                                                     | Never                        |

### A day in the life (second working day of the month)

- **08:45** An offer was accepted last night: a project engineer for Arjun's team starts in ten days. She keys the new hire into INFO-TECH: the record, the leave entitlement and the payroll details.
- **09:30** Copies the same details into HQ's spreadsheet format and emails Xinyi to create the SAP record. Nothing else can start until it exists.
- **10:15** Arjun asks in chat whether last week's hire will have intranet access on Monday. She checks her email: HQ has not confirmed the SAP record yet.
- **11:00** Xinyi replies: SAP shows a different job title for a Singapore engineer. Mei Ling exports from INFO-TECH, reformats and replies. Nobody records which value was right.
- **13:30** Month-end: she exports leave and payroll summaries from INFO-TECH and asks Xinyi in chat for HQ's file.
- **14:30** A colleague asks why a large travel claim has not been paid. It is waiting for HQ Treasury, but all she can say is "it's at HQ".
- **15:30** The HQ file opens as garbled characters. She re-imports it, renames the 入职日期 and 假期类型 columns and converts the dates.
- **17:00** She finds 调休 and 探亲假 rows and messages Xinyi to ask how they were reported last month.
- **18:30** She leaves with the summary half done and the SAP record still unconfirmed.

### Key quote (illustrative)

> "Three systems, one new hire, and I am still the one carrying the details between them."

### What success looks like

- Each new-hire field is typed once (SM-05: from about three times to one).
- Intranet access follows the SAP record the same day, without her asking (SM-03, SM-10).
- The monthly summary takes two hours or less, and is final the same day (SM-01, SM-07).
- At least 98% of records agree across systems, and every disagreement waits in one queue with the sources side by side (SM-02).
- No employee data leaves by email, and every cross-border flow is recorded and approved ([SH-04](hypotheses.md#sh-04--visible-controls-make-cross-border-flows-acceptable)).

### Accessibility and language needs

- An English interface that shows HQ terms in both languages (年假 / Annual Leave, 入职日期 / hire date), so she never translates by hand.
- Keyboard-first work in dense tables: shortcuts, the command palette (⌘K or Ctrl+K), visible focus and tabular numerals.
- Nothing moves in a table or form while she is working in it, and reduced motion is respected.
- Long sessions at month-end: a dark theme, and text contrast of at least 4.5:1 to limit eye strain.
- A docked 14-inch laptop, so every layout must be fully usable at 1024 px.

### How HuiTong serves her

| Screen                                                                                                 | What it does for her                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview (`/overview`)                                                                                 | Her first screen each morning: sync health, open SG01 conflicts, approvals waiting for her (mapping versions, transfer entries, workflow steps), this month's summary status and the activity feed                                                                                                                                           |
| Employees (`/employees`)                                                                               | One searchable master in place of the spreadsheets. The record drawer puts INFO-TECH and SAP values side by side and highlights conflicts. She picks the source of truth, or enters a value with a reason, and the decision lands in the audit history. "Run sync" previews creates, updates, skips and conflicts before anything is written |
| Workflows (`/workflows`, `/workflows/:instanceId`)                                                     | Each new hire from one entry to day 1: the SAP record, the INFO-TECH record and intranet access in order, with owners and SLAs. She approves the preview of the INFO-TECH write, and sees which claims wait for Treasury, so she can answer "where is it?"                                                                                   |
| Attendance and leave (`/attendance-leave`, `/attendance-leave/mappings`, `/attendance-leave/template`) | One run: both sides pulled, categories mapped by approved rules, only the exceptions left to clear, then the company template previewed and exported as .xlsx                                                                                                                                                                                |
| Connectors (`/connectors`)                                                                             | Status and recent runs for each connector. As SG01's data steward she approves SG01 mapping versions                                                                                                                                                                                                                                         |
| Governance (`/governance`)                                                                             | She approves cross-border transfer entries for SG01 data, with the DPO's reference                                                                                                                                                                                                                                                           |

### Assumptions to validate

- She, rather than HQ or a payroll specialist, prepares the monthly summary (Q-06, Q-29, Q-30).
- A new hire is typed into about three places today, and the SAP record is requested by email (A-12, A-62; Q-33, Q-59).
- She has no access to HQ's SAP, and HQ data reaches her only as exports (Q-04, Q-08).

---

## 2. Zhou Xinyi, China HQ HR partner

Zhou Xinyi 周欣怡 · `HR_HQ` · China HQ (`CN01`)

### Role and context

- HR business partner for overseas entities (海外HRBP) in HQ's Human Resources department (人力资源部). Reports to the HR director at HQ, who is the data owner for CN01.
- Creates and keeps Singapore staff in HQ's customised SAP (A-05: SG employees are also recorded at HQ), so every Singapore hire waits on her before getting intranet access (A-62).
- Data steward for about 70 CN01 employees (A-11). Prepares group headcount and leave reporting together with Singapore.
- Works in 简体中文. Reads English well, but prefers Chinese for HR terms and for anything she must get exactly right.

### Goals

- Receive Singapore hires in SAP's structure (员工编号, 部门编码, SAP codes), complete, without chasing anyone.
- Hold only the Singapore fields HQ is authorised to hold, and be able to show compliance what crossed the border and why.
- Know which system is right for each field, so that each question is settled once.
- Group reports whose numbers match Singapore's.
- Other entities and companies joining group reporting without a new IT project each time.

### Frustrations

- Singapore spreadsheets in English, with Singapore-style dates and department codes that she maps by hand to 8-digit org-unit codes such as `50001030`.
- Being the bottleneck: a Singapore new hire cannot get intranet access until she has re-keyed them into SAP.
- Attachments with salary and bank columns HQ never asked for, left sitting in her inbox.
- Two job titles for the same person, and no way to tell which is current.
- Questions scattered across chat tools and email, and leave categories that do not line up with Singapore's (探亲假 has no counterpart), with holiday calendars that differ, including China's make-up working days.

### Tools today

| Tool                                              | What she uses it for                                            | How often |
| ------------------------------------------------- | --------------------------------------------------------------- | --------- |
| HQ's customised SAP (exact product unknown, Q-02) | HQ HR master data, including SG01 staff                         | Daily     |
| HQ intranet                                       | News, policies, claims and approvals                            | Daily     |
| DingTalk 钉钉 or Lark 飞书 (Q-61)                 | Messages and HQ approvals; attendance (source to confirm, Q-09) | All day   |
| WeChat 微信                                       | Messages with Singapore colleagues                              | Daily     |
| WPS Office and Excel                              | Exports, SAP upload files and group reporting workbooks         | Daily     |
| Email                                             | Files from Singapore                                            | Daily     |

### A day in the life

- **09:00** Two Singapore new hires are waiting for their SAP records; one starts on Monday.
- **09:45** Mei Ling's spreadsheet arrives by email. She maps department names to org-unit codes, converts the dates to `YYYY/MM/DD` and keys the hire into SAP.
- **10:30** The file includes salary and bank columns HQ did not ask for. She deletes them, but the original stays in her inbox.
- **11:30** Two Singapore job titles differ between SAP and the file. She asks Mei Ling on WeChat and waits until the afternoon for an answer.
- **14:00** She exports CN01 leave for the monthly summary, saves it as CSV from WPS and sends it to Singapore.
- **16:00** The HR director asks for overseas headcount by department. She uses last month's spreadsheet, because it is the only consolidated view.

### Key quote (illustrative)

> "我不怕数据多，就怕不知道哪一份才是最新、最准的。"
>
> (A lot of data does not worry me. Not knowing which copy is the latest and the right one does.)

### What success looks like

- Singapore hires reach SAP in its structure and in 中文, complete, without anyone emailing a file, and intranet access follows on its own (SM-10).
- She sees only what HQ may see, and the interface tells her why a field is hidden (GR-03).
- Each field has a source of truth, and disagreements are settled once (SM-02).
- Another company's HR export is connected in under a day (SM-06).

### Accessibility and language needs

- 简体中文 as her default interface, switchable at runtime, with Noto Sans SC sized to match the Latin text.
- Chinese field and category names as primary labels, with the canonical names alongside (员工编号 / `employeeNo`, 调休 / Time-off in lieu).
- Unambiguous, year-first dates.
- Everything loads from mainland China: self-hosted fonts and first-party analytics, with no Google services or third-party CDNs.
- Notifications in DingTalk or Lark, whichever HQ uses (Q-61), and a discrepancy explainer that answers in 中文.

### How HuiTong serves her

| Screen                                                                      | What it does for her                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflows (`/workflows`, `/workflows/:instanceId`)                          | The Singapore hires waiting for an SAP record. She approves a preview of each SAP write, as SAP's data steward, instead of re-keying the hire                                                                                                                                                                                                                                                         |
| Employees (`/employees`)                                                    | SG01 and CN01 records with 中文 labels. The drawer shows SAP's value next to INFO-TECH's. Where INFO-TECH owns a field, the discrepancy tells her which SAP value to correct; conflicts on shared fields are decided by `HR_SG`, and she sees the decision and its reason. SG01 RESTRICTED fields stay masked, and "Why is this hidden?" names the missing transfer entry. She decides CN01 conflicts |
| Discrepancy explainer (in the record drawer)                                | Explains a disagreement between systems in 中文 or English. It has no write path                                                                                                                                                                                                                                                                                                                      |
| Connectors and AI mapping wizard (`/connectors`, `/connectors/new-mapping`) | Proposals for exports with Chinese headers, such as a joining company's sample that mixes English and 简体中文 headers (入职日期 → `hireDate`), each with a confidence score, a rationale and "Requires approval". Approval stays with the data steward of the connector's entity, which for `cn-hq` is her                                                                                           |
| Governance (`/governance`)                                                  | She requests SG01 RESTRICTED fields through the cross-border transfer register. She cannot approve her own request                                                                                                                                                                                                                                                                                    |
| Attendance and leave (`/attendance-leave/mappings`)                         | She approves CN category mappings (年假 → `ANNUAL`, 调休 → `TIME_OFF_IN_LIEU`) and clears CN exceptions                                                                                                                                                                                                                                                                                               |
| Overview (`/overview`) and Integration map (`/integration-map`)             | The same overview in 中文, and every connected system with its status in one picture                                                                                                                                                                                                                                                                                                                  |

### Assumptions to validate

- HQ holds SG01 staff in SAP under an employee number shared with INFO-TECH (A-04: an HQ-assigned `E1xxxxx` number, the only match key; A-05; Q-04, Q-05).
- She, or someone else in HQ HR, creates each Singapore hire's SAP record today (A-62; Q-59).
- HQ needs only a subset of Singapore fields (Q-08).
- HQ attendance comes from SAP or DingTalk (Q-09), and HQ notifications belong in DingTalk or Lark (A-18: notification channels; Q-61).

---

## 3. Arjun Menon, hiring manager

Arjun Menon · `HIRING_MANAGER` · Head of Regional Sales (区域销售部), the Singapore hub (`SG01`)

### Role and context

- Leads Regional Sales for Southeast Asia from Singapore: sales managers, project and application engineers, and sales support (assumed about 12 people). Reports to the head of the Singapore hub.
- Hires three or four people a year, mostly engineers and sales staff who travel to customers and project sites (assumed).
- Spends much of the week with customers, and reads messages and intranet notices on his phone between meetings.
- His team's travel and project expenses go through intranet claims, and the larger ones need HQ Treasury's extra approval (A-63), so he often waits on payments he cannot trace.
- Works in English.

### Goals

- New hires start with a laptop, accounts and intranet access, ready to travel and to claim expenses from their first trip.
- He knows where each hire, and each large claim, stands without having to ask.
- He fills in each request once.

### Frustrations

- After approval the hire disappears from view, and its status lives in HR's inbox.
- HR asks him again for details he already gave.
- New hires spend their first days without intranet access, so they cannot read the policies or file a claim.
- Large claims sit with HQ Treasury for days, and nobody can tell him where they are.
- He chases HR, admin and finance separately, in chat and by email.

### Tools today

| Tool                                      | What he uses it for                       | How often          |
| ----------------------------------------- | ----------------------------------------- | ------------------ |
| HQ intranet                               | Claims, approvals, policies and news      | A few times a week |
| Chat (Lark, WeChat or another tool, Q-61) | HR, admin and his own team                | All day            |
| Email and calendar                        | Customer meetings; intranet notices       | Daily              |
| Phone                                     | Between customer meetings and site visits | Daily              |

### A day in the life

- **08:15** Checks messages on his phone before the first customer meeting.
- **10:00 to 12:30** Customer meetings.
- **12:45** His request for a project engineer has been approved. Nothing tells him what happens next.
- **15:00** Asks Mei Ling whether last week's hire will have intranet access on Monday. She is still waiting for HQ.
- **16:30** A sales manager asks why last month's trip claim has not been paid. Finance says it is "with Treasury".
- **17:30** Another new hire starts on Monday. He asks admin whether the laptop is ready. Nobody knows, because the start date only reached admin yesterday.

### Key quote (illustrative)

> "The hire was approved weeks ago. Why am I still asking whether my new engineer can log in on Monday?"

### What success looks like

- A new hire's intranet access is granted the same day they are entered, once the SAP record exists (SM-03, SM-10).
- He can see each hire's stage, owner and due date, and each large claim's step, without asking ([SH-06](hypotheses.md#sh-06--status-where-people-already-work), [SH-08](hypotheses.md#sh-08-a-threshold-rule-makes-the-treasury-step-certain-and-visible)).
- At least 95% of new hires are fully prepared on day 1 (SM-04).
- Every claim above the threshold is approved by Treasury before it is paid (SM-11).
- He never sees other people's pay or bank data, and can trust that his team's data is protected in the same way (GR-03).

### Accessibility and language needs

- Glanceable, plain-language status: where the hire or claim is, who has it and when it is due.
- One primary action per view, with detail behind progressive disclosure (Hick's law).
- Usable on a tablet between meetings, with generous targets (Fitts's law; WCAG 2.2 target size).
- Notifications that carry the key facts, so he rarely needs to open the app.

### How HuiTong serves him

| Screen                                                                | What it does for him                                                                                                                                     |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflows board and timeline (`/workflows`, `/workflows/:instanceId`) | Every hire from entry to day 1, and his team's claims above the threshold: the current step, its owner, the SLA, and the approval steps shown explicitly |
| Notifications (Lark/Feishu or DingTalk, mocked in the PoC)            | A message at each milestone: hire entered, SAP record created, intranet access granted, preparation complete or overdue, a claim approved by Treasury    |
| Overview (`/overview`)                                                | His open hires and claims, and anything waiting for him                                                                                                  |
| Employees (`/employees`)                                              | INTERNAL fields only. Pay, bank, birth date and other CONFIDENTIAL fields are masked, and "Why is this hidden?" names the clearance needed               |
| Connectors, Governance and other screens                              | The permission-denied state, which names the role needed                                                                                                 |

### Assumptions to validate

- How a hire is approved, and which fields the approval carries (A-10; Q-32).
- Today's lead time to intranet access, and day-1 readiness (A-12; Q-33, Q-48, Q-59).
- Which claims need Treasury, and how long they wait (A-63; Q-60).
- The chat tool Singapore managers use (A-18; Q-61).

---

## Secondary roles

These roles appear in the journeys but do not need full personas this semester.

| Person (demo user)                            | HuiTong role                                             | What they need                                                                                                                                                     | Main screens                                                      | What they never see                                                                   |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Nur Aisyah                                    | `ADMIN_OPS`                                              | Preparation tasks (laptop, desk, accounts) created automatically with the start date and an SLA; notices in Lark/Feishu or DingTalk; only the data each task needs | Task list (`/workflows/tasks`)                                    | Pay, bank details or birth dates                                                      |
| Li Guoqiang 李国强                            | `MANAGEMENT`                                             | A single view with dashboards from authorised sources, with provenance; one set of numbers for Singapore and HQ; English or 中文                                   | Reports (`/reports`), Overview                                    | Any write action; named cross-entity data (aggregates by default)                     |
| An HQ Treasury approver                       | None yet; area 2 decides how the step is approved (Q-60) | Only the claims and payments above the threshold, with what they need to decide; a record that nothing was paid before their approval                              | The approval step on the workflow board, or the intranet (mocked) | Pay and bank data beyond the payment itself; claims below the threshold               |
| Grace Lim                                     | `AUDITOR`                                                | An append-only trail of every write, approval and conflict decision; chain verification; access reviews                                                            | Audit log (`/governance/audit`)                                   | CONFIDENTIAL or RESTRICTED values, which the audit log never holds                    |
| Farhan Ismail                                 | `SYSTEM_ADMIN`                                           | Connector set-up and health, users and roles, platform configuration                                                                                               | Connectors, Settings, Analytics                                   | RESTRICTED values; he cannot approve mappings, conflict decisions or transfer entries |
| Compliance team and DPO                       | None in the PoC                                          | Purpose, lawful basis and mechanism for every flow; evidence for a breach assessment                                                                               | Governance, reviewed with the client (Q-40)                       | Not applicable                                                                        |
| New hires and other employees (data subjects) | None                                                     | Accurate records, a ready first day with intranet access, and as little sharing of their data as possible                                                          | None; HR acts for them                                            | Not applicable                                                                        |

**Not designing for this semester:** recruiters and agencies (there is no applicant-tracking system in the PoC; HuiTong tracks the hire from its entry), employee self-service (employees keep INFO-TECH and the intranet) and payroll specialists (pay is calculated in INFO-TECH). See [scope](../problem-statement.md#25-scope).

## Accessibility across the personas

None of the proto-personas is defined by a disability, but any of them may use a screen magnifier, the keyboard alone, a screen reader or reduced motion, permanently or for a while. HuiTong targets WCAG 2.2 AA. These criteria matter most for these users:

| Criterion                                                             | Where it matters                             | Design response                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1.4.3 Contrast (minimum); 2.4.7 Focus visible                         | Dense tables at month-end (Mei Ling)         | Colour tokens checked at 4.5:1 or more; visible focus rings                                           |
| 2.4.11 Focus not obscured (minimum)                                   | Sticky table headers, drawers and toasts     | A focused row scrolls clear of sticky elements                                                        |
| 2.5.7 Dragging movements                                              | Workflows board                              | Every card can also be moved with a menu action, not only by dragging                                 |
| 2.5.8 Target size (minimum)                                           | Arjun on a tablet                            | Targets of at least 24 × 24 CSS pixels                                                                |
| 3.1.1 Language of page; 3.1.2 Language of parts                       | Bilingual labels such as 年假 / Annual Leave | `lang` set per language, so screen readers switch voice for Chinese text on an English page           |
| 3.3.7 Redundant entry                                                 | Recording a hire                             | Fields entered once carry over to SAP, INFO-TECH and the intranet request; nothing is asked for twice |
| 3.3.8 Accessible authentication (minimum)                             | Sign-in                                      | Password managers and paste allowed; no puzzles                                                       |
| Project rule: reduced motion ([CLAUDE.md](../../CLAUDE.md) section 8) | Overview animations, the 3D integration map  | `prefers-reduced-motion` honoured everywhere; a static frame replaces the 3D animation                |

Evidence is collected by the accessibility guardrail GR-07 in [success-metrics.md](success-metrics.md#guardrails).

## Validation plan

| Persona      | Riskiest assumptions                                                                                        | How we test them                                                                                                              | Questions                          | What changes if we are wrong                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tan Mei Ling | One SG HR executive carries each hire into all three systems and prepares the monthly summary               | Interview and walkthrough at the briefing call; review of the summary's column headers (no rows)                              | Q-06, Q-29, Q-33, Q-48, Q-59       | Split the persona (HR operations and payroll), re-time the journeys, and give the steps to whoever actually owns them |
| Zhou Xinyi   | HQ creates each Singapore hire's SAP record and needs it in SAP's structure; she prefers a 中文 interface   | Interview with the HQ HR counterpart if one can join; otherwise written questions                                             | Q-02, Q-04, Q-05, Q-08, Q-51, Q-59 | If HQ only consumes reports, `HR_HQ` becomes a reader of aggregates and the SG ↔ CN sync changes shape                |
| Arjun Menon  | He loses sight of a hire after approval, and of large claims at Treasury; day-1 readiness is a real problem | Interview with a hiring manager (Q-51); prototype test of the workflow board in W4–W5, ideally with HR staff trying it (Q-63) | Q-32, Q-34, Q-48, Q-60             | The board serves HR and admin first, and managers get notifications only                                              |

- **Proxy users.** Where client staff cannot join a prototype test, people briefed on a persona stand in for them, and their results are labelled as proxy results.
- **After the briefing call.** Within two working days, each persona's label moves from Assumed to Partly validated or Validated (definitions in [README.md](README.md)), the matching assumptions are updated in [../assumptions.md](../assumptions.md), and the change log below records what changed.

## Change log

| Date            | Week | Change                                                                                                                                                                                                                                                                               |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 20 October 2026 | W1   | First version, from PS #17 and desk research                                                                                                                                                                                                                                         |
| 22 October 2026 | W1   | Moved to statement #7, LESSO Solar ([ADR 0022](../adr/0022-final-statement-7-lesso-solar.md)): INFO-TECH, SAP and the intranet replace SG HR, OA and the Excel master; Arjun leads Regional Sales; the SAP-before-intranet rule, the Treasury step and an HQ Treasury approver added |
