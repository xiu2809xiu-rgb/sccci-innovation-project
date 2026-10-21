# Personas

HuiTong 汇通 · Organisation E (Financial Services) · Problem Statement #17

> **Status: Assumed.** These are **proto-personas**. We built them from Problem Statement #17 and desk research before the first client meeting (W2 or W3), and we have not yet met the people they describe. Roles, tools and habits are hypotheses to validate with Organisation E, and every quote is illustrative. Assumptions are logged in [../assumptions.md](../assumptions.md) (A-xx) and tested by the questions in [../client/questions-for-client.md](../client/questions-for-client.md) (Q-xx). Labels follow [README.md](README.md).

All three people are synthetic. They are also HuiTong's seeded demo users, so a walkthrough or a prototype test can be run as the persona, with the matching role, from the demo role switcher.

**Contents:** [At a glance](#personas-at-a-glance) · [1. Tan Mei Ling](#1-tan-mei-ling-sg-hr-executive) · [2. Zhou Xinyi](#2-zhou-xinyi-china-hq-hr-partner) · [3. Arjun Menon](#3-arjun-menon-hiring-manager) · [Secondary roles](#secondary-roles) · [Accessibility across the personas](#accessibility-across-the-personas) · [Validation plan](#validation-plan)

## Personas at a glance

|                                                             | Tan Mei Ling                                         | Zhou Xinyi 周欣怡                                                 | Arjun Menon                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Role                                                        | SG HR executive                                      | China HQ HR partner                                               | Hiring manager, Head of Wealth Management SG                   |
| Entity and location                                         | `SG01` Organisation E Singapore Pte. Ltd., Singapore | `CN01` Organisation E Group HQ, Shanghai                          | `SG01`, Singapore                                              |
| HuiTong role                                                | `HR_SG`                                              | `HR_HQ`                                                           | `HIRING_MANAGER`                                               |
| Working language                                            | English                                              | 简体中文 (reads English well)                                     | English                                                        |
| Journeys ([journey-maps.md](journey-maps.md))               | Both: onboarding and the monthly consolidation       | Both, for the HQ side                                             | Manpower request to day 1                                      |
| Biggest need                                                | Enter data once and close the month quickly          | Singapore data in HQ's structure, and only the fields HQ may hold | Know where a hire stands, and a new hire who is ready on day 1 |
| Main screens                                                | Overview, Employees, Workflows, Attendance and leave | Employees, Governance, AI mapping wizard, Attendance and leave    | Workflows, Overview                                            |
| Success measures ([success-metrics.md](success-metrics.md)) | SM-01, SM-02, SM-05, SM-07                           | SM-02, SM-06, GR-03                                               | SM-03, SM-04                                                   |

---

## 1. Tan Mei Ling, SG HR executive

Tan Mei Ling · `HR_SG` · Organisation E Singapore Pte. Ltd. (`SG01`), Singapore

### Role and context

- HR executive in a small HR team (assumed three people). Reports to the Head of HR, Singapore operation, who is the data owner for SG01 ([GRS 2.1](../grs/grs-by-design.md#21-roles-and-responsibilities)).
- Looks after records, attendance, leave and payroll inputs for about 50 SG01 employees (A-11: we model about 50 SG01 and 70 CN01 employees) in the locally compliant SG HR system.
- Maintains the Excel employee master, the only consolidated view management has (A-07), and prepares the monthly attendance and leave consolidation in the company template.
- Every hand-off runs through her: hiring managers and admin in Teams, HQ HR by email and WeChat.
- Works in English. Speaks Mandarin socially but reads formal Chinese HR terms slowly, so HQ files with Chinese headers cost her time (assumed).

### Goals

- Enter each piece of employee data once, and trust that it reaches HQ and the master.
- Keep SG HR, HQ's system and the master in step without reconciling spreadsheets.
- Close the monthly consolidation quickly and get it right first time.
- See every new hire ready on day 1.
- Spend her time on workforce planning and employee development instead of checking data (Problem Statement #17, "Feelings").

### Frustrations

- Typing the same new hire into a recruitment tracker, SG HR and the Excel master.
- Reformatting HQ files: Chinese headers, `YYYY/MM/DD` dates, SAP codes and CSV text that opens garbled because it was saved as GBK.
- Acting as the relay between Teams, WeChat and email, so the status of every request lives in her inbox.
- Not knowing which version of the master HQ or management is using.
- Emailing files that contain salary and bank columns, with no record of what went where.
- The month-end crunch: about 16 hours of consolidation while the report waits (A-12: assumed baselines).

### Tools today

| Tool                                  | What she uses it for                                                                                             | How often                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| SG HR software (vendor unknown, Q-01) | Employee records, attendance, leave and payroll inputs                                                           | Daily                        |
| OA platform                           | Approved manpower requests and other approvals                                                                   | Daily                        |
| Excel                                 | Employee master; recruitment and onboarding trackers; the consolidation workbook; the company reporting template | Daily, heaviest at month-end |
| Outlook and OneDrive                  | Files to and from HQ, admin and management                                                                       | Daily                        |
| Microsoft Teams                       | Hiring managers, admin and Singapore colleagues                                                                  | All day                      |
| WeChat                                | Quick questions to HQ colleagues                                                                                 | Several times a week         |
| HQ SAP                                | No access (assumed); HQ data reaches her as exports                                                              | Never                        |

### A day in the life (second working day of the month)

- **08:45** OA shows that a manpower request for a Wealth Management analyst was approved last night. She copies its fields into the recruitment tracker and briefs the agency by email.
- **09:30** Keys in yesterday's joiner: SG HR first, then the Excel master, saved as yet another "final" version.
- **10:15** Arjun asks in Teams whether there are CVs yet. She checks OA, her tracker and her inbox to answer him.
- **11:00** Xinyi emails: SAP shows different job titles for two Singapore staff. Mei Ling exports from SG HR, reformats and replies. Nobody records which value was right.
- **13:30** Month-end: she exports attendance and leave from SG HR and asks Xinyi on WeChat for HQ's file.
- **15:30** The HQ file opens as garbled characters. She re-imports it, renames the 入职日期 and 假期类型 columns and converts the dates.
- **17:00** She finds 调休 and 探亲假 rows and messages Xinyi to ask how they were reported last month.
- **18:30** She leaves with the consolidation half done, unsure which version of the master HQ is working from.

### Key quote (illustrative)

> "We have four systems, and I am still the one connecting them, one spreadsheet at a time."

### What success looks like

- Each new-hire field is typed once, at its source (SM-05: from about three times to one).
- The consolidation takes two hours or less, and the report is final the same day (SM-01, SM-07).
- At least 98% of records agree across systems, and every disagreement waits in one queue with the sources side by side (SM-02).
- No employee data leaves by email, and every cross-border flow is recorded and approved ([SH-04](hypotheses.md#sh-04--visible-controls-make-cross-border-flows-acceptable)).

### Accessibility and language needs

- An English interface that shows HQ terms in both languages (年假 / Annual Leave, 入职日期 / hire date), so she never translates by hand.
- Keyboard-first work in dense tables: shortcuts, the command palette (⌘K or Ctrl+K), visible focus and tabular numerals.
- Nothing moves in a table or form while she is working in it, and reduced motion is respected.
- Long sessions at month-end: a dark theme, and text contrast of at least 4.5:1 to limit eye strain.
- A docked 14-inch laptop, so every layout must be fully usable at 1024 px.

### How HuiTong serves her

| Screen                                                                                                 | What it does for her                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview (`/overview`)                                                                                 | Her first screen each morning: sync health, open SG01 conflicts, approvals waiting for her (mapping versions, transfer entries, workflow steps), this month's consolidation status and the activity feed                                                                                                                                |
| Employees (`/employees`)                                                                               | One searchable master instead of the Excel file. The record drawer puts SG HR and CN HQ values side by side and highlights conflicts. She picks the source of truth, or enters a value with a reason, and the decision lands in the audit history. "Run sync" previews creates, updates, skips and conflicts before anything is written |
| Workflows (`/workflows`, `/workflows/:instanceId`)                                                     | Each manpower request from OA approval to day 1, with owners and SLAs. She records the hire once, and the request's fields carry over                                                                                                                                                                                                   |
| Attendance and leave (`/attendance-leave`, `/attendance-leave/mappings`, `/attendance-leave/template`) | One consolidation run: both sides pulled, categories mapped by approved rules, only the exceptions left to clear, then the company template previewed and exported as .xlsx                                                                                                                                                             |
| Connectors (`/connectors`)                                                                             | Status and recent runs for each connector. As SG01's data steward she approves SG01 mapping versions                                                                                                                                                                                                                                    |
| Governance (`/governance`)                                                                             | She approves cross-border transfer entries for SG01 data, with the DPO's reference                                                                                                                                                                                                                                                      |

### Assumptions to validate

- She, rather than HQ or a payroll specialist, owns both the Excel master and the monthly consolidation (A-07; Q-06, Q-29).
- A new hire is typed into about three places today (A-12; Q-33).
- She has no access to HQ's SAP, and HQ data reaches her only as exports (Q-04, Q-08).

---

## 2. Zhou Xinyi, China HQ HR partner

Zhou Xinyi 周欣怡 · `HR_HQ` · Organisation E Group HQ (`CN01`), Shanghai

### Role and context

- HR business partner for overseas entities (海外HRBP) in HQ's Human Resources department (人力资源部). Reports to the HR director, Group HQ, who is the data owner for CN01.
- Keeps Singapore staff in HQ's SAP-like HR system as overseas staff (A-05: SG employees are also recorded at HQ) and applies group HR policy to them.
- Data steward for about 70 CN01 employees (A-11). Prepares group headcount and attendance reporting together with Singapore.
- Approves the HQ step of overseas manpower requests in OA (assumed; Q-32).
- Works in 简体中文. Reads English well, but prefers Chinese for HR terms and for anything she must get exactly right.

### Goals

- Receive Singapore data in HQ's structure (员工编号, 部门编码, SAP codes) without chasing files.
- Hold only the Singapore fields HQ is authorised to hold, and be able to show compliance what crossed the border and why.
- Know which system is right for each field, so that each question is settled once.
- Group reports whose numbers match Singapore's.
- New subsidiaries joining group reporting without a new IT project each time.

### Frustrations

- Singapore files in English, with ISO dates and department codes such as `SG-COMP` that she maps by hand to 8-digit org-unit codes such as `50001030`.
- Attachments with salary and bank columns HQ never asked for, left sitting in her inbox.
- Two job titles for the same person, and no way to tell which is current.
- Questions scattered across WeChat, DingTalk and email.
- Leave categories that do not line up with Singapore's (探亲假 has no counterpart), and holiday calendars that differ, including China's make-up working days.

### Tools today

| Tool                                                 | What she uses it for                                            | How often |
| ---------------------------------------------------- | --------------------------------------------------------------- | --------- |
| HQ SAP HCM-like system (exact product unknown, Q-02) | HQ HR master data, including SG01 staff held as overseas staff  | Daily     |
| OA platform                                          | Approvals, including HQ steps of Singapore requests             | Daily     |
| DingTalk 钉钉                                        | Messages, HQ approvals and attendance (source to confirm, Q-09) | All day   |
| WeChat 微信 and WeChat Work 企业微信                 | Messages with Singapore colleagues                              | Daily     |
| WPS Office and Excel                                 | Exports, SAP upload files and group reporting workbooks         | Daily     |
| Email                                                | Files from Singapore                                            | Daily     |

### A day in the life

- **09:00** DingTalk shows two approvals waiting. One is the HQ step of a Singapore manpower request.
- **09:45** An updated staff list arrives from Singapore by email. She maps department names to org-unit codes, converts ISO dates to `YYYY/MM/DD` and builds the SAP upload file.
- **10:30** The file includes salary and bank columns HQ did not ask for. She deletes them, but the original stays in her inbox.
- **11:30** Two Singapore job titles differ between SAP and the file. She asks Mei Ling on WeChat and waits until the afternoon for an answer.
- **14:00** She exports CN01 attendance and leave for the monthly consolidation, saves it as CSV from WPS and sends it to Singapore.
- **16:00** The HR director asks for overseas headcount by department. She uses last month's spreadsheet, because it is the only consolidated view.

### Key quote (illustrative)

> "我不怕数据多，就怕不知道哪一份才是最新、最准的。"
>
> (A lot of data does not worry me. Not knowing which copy is the latest and the right one does.)

### What success looks like

- Singapore data appears in HQ's structure and in 中文, without asking anyone for a file.
- She sees only what HQ may see, and the interface tells her why a field is hidden (GR-03).
- Each field has a source of truth, and disagreements are settled once (SM-02).
- A new subsidiary's HR export is connected in under a day (SM-06).

### Accessibility and language needs

- 简体中文 as her default interface, switchable at runtime, with Noto Sans SC sized to match the Latin text.
- Chinese field and category names as primary labels, with the canonical names alongside (员工编号 / `employeeNo`, 调休 / Time-off in lieu).
- Unambiguous, year-first dates.
- Everything loads from mainland China: self-hosted fonts and first-party analytics, with no Google services or third-party CDNs.
- Notifications in DingTalk, not Teams, and a discrepancy explainer that answers in 中文.

### How HuiTong serves her

| Screen                                                                      | What it does for her                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employees (`/employees`)                                                    | SG01 and CN01 records with 中文 labels. The drawer shows SAP's value next to SG HR's. Where SG HR owns a field, the discrepancy tells her which SAP value to correct; conflicts on shared fields are decided by `HR_SG`, and she sees the decision and its reason. SG01 RESTRICTED fields stay masked, and "Why is this hidden?" names the missing transfer entry. She decides CN01 conflicts |
| Discrepancy explainer (in the record drawer)                                | Explains a disagreement between systems in 中文 or English. It has no write path                                                                                                                                                                                                                                                                                                              |
| Connectors and AI mapping wizard (`/connectors`, `/connectors/new-mapping`) | Proposals for exports with Chinese headers, such as the `MY01` export that mixes English and 简体中文 headers (入职日期 → `hireDate`), each with a confidence score, a rationale and "Requires approval". Approval stays with the data steward of the connector's entity, which for `cn-hq` is her                                                                                            |
| Governance (`/governance`)                                                  | She requests SG01 RESTRICTED fields through the cross-border transfer register. She cannot approve her own request                                                                                                                                                                                                                                                                            |
| Attendance and leave (`/attendance-leave/mappings`)                         | She approves CN category mappings (年假 → `ANNUAL`, 调休 → `TIME_OFF_IN_LIEU`) and clears CN exceptions                                                                                                                                                                                                                                                                                       |
| Overview (`/overview`) and Integration map (`/integration-map`)             | The same overview in 中文, and every connected system with its status in one picture                                                                                                                                                                                                                                                                                                          |

### Assumptions to validate

- HQ holds SG01 staff as overseas staff, under an employee number shared with SG HR (A-04: an HQ-assigned `E1xxxxx` number, the only match key; A-05; Q-04, Q-05).
- HQ needs only a subset of Singapore fields (Q-08).
- HQ attendance comes from SAP or DingTalk (Q-09), and HQ notifications belong in DingTalk or WeChat Work (A-18: notification channels; Q-10).

---

## 3. Arjun Menon, hiring manager

Arjun Menon · `HIRING_MANAGER` · Head of Wealth Management (财富管理部), Organisation E Singapore Pte. Ltd. (`SG01`)

### Role and context

- Leads Wealth Management in Singapore: relationship managers, investment analysts and client-service staff (assumed about 12 people). Reports to the Singapore chief executive.
- Raises manpower requests in OA and hires three or four people a year, mostly client-facing (assumed).
- Spends most of the day in client meetings and reads Teams and OA notices on his phone between them.
- Client-facing hires also need compliance clearance before they can serve clients, so a late or unprepared start costs revenue as well as time.
- Works in English.

### Goals

- Recruitment starts as soon as a request is approved.
- He knows where each hire stands without having to ask.
- New hires are productive from day 1, with laptop, desk, accounts and system access ready.
- He fills in each request once.

### Frustrations

- After approval the request disappears from view, and its status lives in HR's inbox.
- HR asks him again for details he already put in the OA form.
- New hires spend their first days waiting for a laptop or CRM access.
- He chases HR and admin separately, in Teams and by email.

### Tools today

| Tool                   | What he uses it for                                         | How often           |
| ---------------------- | ----------------------------------------------------------- | ------------------- |
| OA platform            | Raises manpower requests; approves his team's requests      | A few times a month |
| Microsoft Teams        | HR, admin and his own team                                  | All day             |
| Outlook and calendar   | Client meetings; OA notices                                 | Daily               |
| CRM                    | Client relationships (no HR data flow identified yet, Q-11) | Daily               |
| Phone (Teams, Outlook) | Between client meetings                                     | Daily               |

### A day in the life

- **08:15** Checks Teams on his phone before the first client meeting.
- **10:00 to 12:30** Client meetings.
- **12:45** OA notice: his request for an investment analyst has been approved. Nothing tells him what happens next.
- **15:00** Asks Mei Ling in Teams whether the agency has sent CVs for an earlier vacancy.
- **17:30** Another new hire starts on Monday. He asks admin whether the laptop and CRM access are ready. Nobody knows, because the start date only reached admin yesterday.

### Key quote (illustrative)

> "The headcount was approved weeks ago. Why am I still asking HR whether my new analyst will have a laptop on Monday?"

### What success looks like

- The requisition exists within minutes of approval (SM-03: under 5 minutes).
- He can see each hire's stage, owner and due date without asking ([SH-06](hypotheses.md#sh-06--status-where-people-already-work)).
- At least 95% of new hires are fully prepared on day 1 (SM-04).
- He never sees other people's pay or bank data, and can trust that his team's data is protected in the same way (GR-03).

### Accessibility and language needs

- Glanceable, plain-language status: where the request is, who has it and when it is due.
- One primary action per view, with detail behind progressive disclosure (Hick's law).
- Usable on a tablet between meetings, with generous targets (Fitts's law; WCAG 2.2 target size).
- Notifications that carry the key facts, so he rarely needs to open the app.

### How HuiTong serves him

| Screen                                                                | What it does for him                                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflows board and timeline (`/workflows`, `/workflows/:instanceId`) | Every request from OA approval to day 1: the current step, its owner, the SLA, and the OA approval steps shown explicitly                  |
| Notifications (Teams, mocked in the PoC)                              | A message at each milestone: requisition opened, hire recorded, preparation complete or overdue                                            |
| Overview (`/overview`)                                                | His open requests and anything waiting for him                                                                                             |
| Employees (`/employees`)                                              | INTERNAL fields only. Pay, bank, birth date and other CONFIDENTIAL fields are masked, and "Why is this hidden?" names the clearance needed |
| Connectors, Governance and other screens                              | The permission-denied state, which names the role needed                                                                                   |

### Assumptions to validate

- The OA approval steps and the fields a manpower request carries (A-10: manpower request steps; Q-32).
- Today's lead time and day-1 readiness (A-12; Q-33, Q-48).
- Teams is the right channel for Singapore managers (A-18; Q-10).

---

## Secondary roles

These roles appear in the journeys but do not need full personas this semester.

| Person (demo user)                            | HuiTong role    | What they need                                                                                                                                   | Main screens                                | What they never see                                                                   |
| --------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Nur Aisyah                                    | `ADMIN_OPS`     | Preparation tasks (laptop, desk, accounts) created automatically with the start date and an SLA; notices in Teams; only the data each task needs | Task list (`/workflows/tasks`)              | Pay, bank details or birth dates                                                      |
| Li Guoqiang 李国强                            | `MANAGEMENT`    | Same-day consolidated reports from authorised sources, with provenance; one set of numbers for Singapore and HQ; English or 中文                 | Reports (`/reports`), Overview              | Any write action; named cross-entity data (aggregates by default)                     |
| Grace Lim                                     | `AUDITOR`       | An append-only trail of every write, approval and conflict decision; chain verification; access reviews                                          | Audit log (`/governance/audit`)             | CONFIDENTIAL or RESTRICTED values, which the audit log never holds                    |
| Farhan Ismail                                 | `SYSTEM_ADMIN`  | Connector set-up and health, users and roles, platform configuration                                                                             | Connectors, Settings, Analytics             | RESTRICTED values; he cannot approve mappings, conflict decisions or transfer entries |
| Compliance team and DPO                       | None in the PoC | Purpose, lawful basis and mechanism for every flow; evidence for a breach assessment                                                             | Governance, reviewed with the client (Q-40) | Not applicable                                                                        |
| New hires and other employees (data subjects) | None            | Accurate records, a ready first day, and as little sharing of their data as possible                                                             | None; HR acts for them                      | Not applicable                                                                        |

**Not designing for this semester:** recruiters and agencies (there is no applicant-tracking system in the PoC; HuiTong tracks the requisition and the hire only), employee self-service (employees keep their local HR systems) and payroll specialists (pay is calculated in the locally compliant payroll systems). See [scope](../problem-statement.md#25-scope).

## Accessibility across the personas

None of the proto-personas is defined by a disability, but any of them may use a screen magnifier, the keyboard alone, a screen reader or reduced motion, permanently or for a while. HuiTong targets WCAG 2.2 AA. These criteria matter most for these users:

| Criterion                                                             | Where it matters                             | Design response                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.4.3 Contrast (minimum); 2.4.7 Focus visible                         | Dense tables at month-end (Mei Ling)         | Colour tokens checked at 4.5:1 or more; visible focus rings                                 |
| 2.4.11 Focus not obscured (minimum)                                   | Sticky table headers, drawers and toasts     | A focused row scrolls clear of sticky elements                                              |
| 2.5.7 Dragging movements                                              | Workflows board                              | Every card can also be moved with a menu action, not only by dragging                       |
| 2.5.8 Target size (minimum)                                           | Arjun on a tablet                            | Targets of at least 24 × 24 CSS pixels                                                      |
| 3.1.1 Language of page; 3.1.2 Language of parts                       | Bilingual labels such as 年假 / Annual Leave | `lang` set per language, so screen readers switch voice for Chinese text on an English page |
| 3.3.7 Redundant entry                                                 | Recording a hire                             | Fields from the OA request carry over; nothing is asked for twice                           |
| 3.3.8 Accessible authentication (minimum)                             | Sign-in                                      | Password managers and paste allowed; no puzzles                                             |
| Project rule: reduced motion ([CLAUDE.md](../../CLAUDE.md) section 8) | Overview animations, the 3D integration map  | `prefers-reduced-motion` honoured everywhere; a static frame replaces the 3D animation      |

Evidence is collected by the accessibility guardrail GR-07 in [success-metrics.md](success-metrics.md#guardrails).

## Validation plan

| Persona      | Riskiest assumptions                                                                                        | How we test them                                                                                       | Questions                    | What changes if we are wrong                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tan Mei Ling | One SG HR executive owns both the Excel master and the consolidation; a new hire is typed into three places | Interview and walkthrough at the first client meeting; review of the master's column headers (no rows) | Q-06, Q-29, Q-33, Q-48       | Split the persona (HR operations and payroll), re-time both journeys, and give the consolidation steps to whoever actually owns them |
| Zhou Xinyi   | HQ keeps Singapore staff in SAP and needs them in HQ's structure; she prefers a 中文 interface              | Interview with the HQ HR counterpart if one can join; otherwise written questions                      | Q-02, Q-04, Q-05, Q-08, Q-51 | If HQ only consumes reports, `HR_HQ` becomes a reader of aggregates and the SG ↔ CN sync changes shape                               |
| Arjun Menon  | He loses sight of a request after approval; day-1 readiness is a real problem                               | Interview with a hiring manager (Q-51); prototype test of the workflow board in W4–W5                  | Q-32, Q-34, Q-48             | The board serves HR and admin first, and managers get notifications only                                                             |

- **Proxy users.** Where client staff cannot join a prototype test, people briefed on a persona stand in for them, and their results are labelled as proxy results.
- **After the meeting.** Within two working days, each persona's label moves from Assumed to Partly validated or Validated (definitions in [README.md](README.md)), the matching assumptions are updated in [../assumptions.md](../assumptions.md), and the change log below records what changed.

## Change log

| Date            | Week | Change                                       |
| --------------- | ---- | -------------------------------------------- |
| 20 October 2026 | W1   | First version, from PS #17 and desk research |
