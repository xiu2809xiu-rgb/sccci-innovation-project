// The product backlog as data: sprints, epics and user stories with acceptance
// criteria. `seed-backlog.mjs` creates them in GitHub (milestones, issues,
// sub-issues) and `render-backlog.mjs` writes docs/agile/backlog.md from it,
// so the plan is reviewed in a pull request before anything is created.
// Stories already delivered name the branch that delivered them (`deliveredBy`).

const AREA = {
  1: 'area: 1 integration core',
  2: 'area: 2 workflow automation',
  3: 'area: 3 attendance and reporting',
  4: 'area: 4 governance and monitoring',
  team: 'area: team',
};

/** Sprint n runs Monday to Sunday of module week n, from W1 = 19 Oct 2026. */
export const SPRINTS = [
  { number: 1, goal: 'Platform base, security scanning and the Agile workflow in GitHub' },
  { number: 2, goal: 'Problem allocation; prepare and hold the first client session' },
  { number: 3, goal: 'Project plan; area owners agreed; client answers folded into the backlog' },
  { number: 4, goal: 'UI prototype across every area' },
  { number: 5, goal: 'Proposal presentation (25%)' },
  { number: 6, goal: 'Backlog refinement; area owners start their core logic' },
  { number: 7, goal: 'Mock job interview (15%): each member explains their own code' },
  { number: 8, goal: 'AI-assisted coding: workflow, consolidation and governance cores' },
  { number: 9, goal: 'AI-assisted coding: end-to-end paths between the areas' },
  { number: 10, goal: 'AI-assisted coding: reports and administration screens' },
  { number: 11, goal: 'AI-assisted coding: hardening and integration tests' },
  { number: 12, goal: 'AI-assisted coding: freeze features for the technical review' },
  { number: 13, goal: 'Technical review (25%)' },
  { number: 14, goal: 'Observability: tracing, metrics and dashboards' },
  { number: 15, goal: 'Clickstream analytics' },
  { number: 16, goal: 'AI token usage and cost tracking' },
  { number: 17, goal: 'Deployment hardening, DAST and rehearsal' },
  { number: 18, goal: 'Final presentation (35%)' },
  { number: 19, goal: 'Client check-in and handover' },
];

export const EPICS = [
  {
    key: 'P',
    title: 'Platform foundation',
    area: AREA[1],
    labels: ['req: M4 best practices', 'req: M5 team Git workflow'],
    goal: 'A monorepo, design system, app shell, backend base and delivery workflow that every area builds on, so owners write domain logic instead of plumbing.',
    stories: [
      {
        key: 'P-1',
        title: 'Monorepo, tooling, CI and Docker',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/platform-base',
        story:
          'As a developer on the team, I want one repository with shared tooling, CI and Docker, so that I can run, test and ship any part of HuiTong the same way.',
        acceptance: [
          'Given a fresh clone, when I run `pnpm install` and `docker compose up --build`, then every service starts and reports healthy.',
          'Given a pull request, when CI runs, then lint, typecheck, unit and integration tests, the build and the Docker build all run.',
          'Given a commit message, when it is not a Conventional Commit, then the commit is refused.',
        ],
      },
      {
        key: 'P-2',
        title: 'Problem analysis, design thinking, GRS and decision records',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/platform-base',
        labels: ['req: M1 design thinking', 'req: M2 GRS by design'],
        story:
          'As the team, we want the problem, users, risks and decisions written down, so that every feature traces back to a real need and a recorded choice.',
        acceptance: [
          'Given the docs, when an assessor reads them, then personas, journey maps, how-might-we statements and success metrics are there.',
          'Given the GRS register, when a risk is listed, then it has an owner, a mitigation and inherent and residual ratings.',
          'Given a stack choice, when it differs from CLAUDE.md, then an ADR explains it.',
        ],
      },
      {
        key: 'P-3',
        title: 'Backend foundation: auth, RBAC, masking, audit, health and mock systems',
        sprint: 1,
        points: 13,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/platform-base',
        story:
          'As an HR user, I want to sign in safely and see only the data my role allows, so that employee data is protected from the first screen.',
        acceptance: [
          'Given a password sign-in, when the password is wrong, then the response takes as long as for an unknown email and reveals neither.',
          'Given a role without clearance, when it reads a salary, then the value comes back masked with the reason.',
          'Given any write, when it succeeds, then an append-only audit event records who, what and when.',
          'Given the mock SG HR, CN HQ and OA systems, when they start, then they serve synthetic data in their own schemas.',
        ],
      },
      {
        key: 'P-4',
        title: 'Design system, app shell, landing page and overview',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/platform-base',
        story:
          'As an HR user, I want a calm, bilingual app shell with an overview of sync health and my queues, so that I know what needs me as soon as I sign in.',
        acceptance: [
          'Given the app, when I switch between English and 简体中文 or light and dark, then every string and colour follows without a reload.',
          'Given the overview, when a connector fails, then the page says the figures may be incomplete.',
          'Given the initial page load, when it is measured, then the JavaScript stays within 250 KB gzip.',
        ],
      },
      {
        key: 'P-5',
        title: 'Security scanning in GitHub',
        sprint: 1,
        points: 3,
        priority: 'must',
        done: true,
        deliveredBy: 'ci/security-scanning',
        labels: ['req: M4 best practices'],
        story:
          'As the team lead, I want SAST, dependency review, image scanning and Dependabot on every change, so that vulnerabilities are caught before they reach main.',
        acceptance: [
          'Given a pull request, when it adds a high-severity dependency vulnerability, then dependency review fails.',
          'Given a pull request, when CodeQL finds a new high-severity alert, then the merge into main is blocked.',
          'Given a built image, when it has a fixable High or Critical vulnerability, then CI fails.',
        ],
      },
      {
        key: 'P-6',
        title: 'Agile workflow in GitHub',
        sprint: 1,
        points: 3,
        priority: 'must',
        done: true,
        deliveredBy: 'chore/agile-workflow',
        story:
          'As the team lead, I want epics, stories, sprints, a board, a Definition of Done and a test plan in GitHub, so that the team plans and tracks work in one place.',
        acceptance: [
          'Given a new issue, when I open the form, then I can choose an epic, a user story, a task, a spike or a bug, each with its own fields.',
          'Given a story, when it is created, then it has acceptance criteria, an estimate, a priority and the Definition of Done.',
          'Given the board, when I open it, then stories are grouped by sprint and status.',
        ],
      },
      {
        key: 'P-7',
        title: 'Head starts for areas 2 to 4',
        sprint: 2,
        points: 8,
        priority: 'must',
        story:
          'As an area owner, I want my module scaffolded with data models, API contracts, screens on typed mock data and an implementation guide, so that I can start on my core logic in week 6.',
        acceptance: [
          'Given areas 2, 3 and 4, when an owner opens their module, then routes return typed mock data documented in Swagger.',
          'Given each area, when the owner opens docs/team/, then a guide explains the domain, the interfaces and where to start.',
          'Given each area, when tests run, then skeleton tests exist for the core logic the owner will write.',
        ],
      },
      {
        key: 'P-8',
        title: 'Hardening and handover',
        sprint: 17,
        points: 8,
        priority: 'must',
        labels: ['req: M4 best practices'],
        story:
          'As the team, we want a final sweep for secrets, dead code and broken links, and a demo that cannot let us down on the day, so that what we hand over and present is clean and honest.',
        // The demo-reliability criteria are adopted from Azri's integrated plan (prompt 002).
        acceptance: [
          'Given the repository and its history, when they are scanned, then no secret or licence key is found.',
          'Given every page, when Lighthouse runs, then Performance, Accessibility and Best Practices score 90 or more.',
          'Given the build report, when it is read, then every claim links to a command result or a screenshot.',
          'Given the one-click demo reset, when it runs, then it rebuilds only the synthetic demo data, and it refuses to run against a database that is not marked as a demo.',
          'Given the timed full rehearsal, when it runs in sprint 17, then the whole demo fits the slot, and the reset and a regression run are repeated just before the presentation.',
          'Given the live demo fails on the day, when we switch, then a recorded backup demo and a tested local Docker fallback are ready.',
        ],
      },
      {
        key: 'P-9',
        title: 'Hero journey and proof points as end-to-end tests',
        sprint: 11,
        points: 5,
        priority: 'must',
        labels: ['req: M4 best practices'],
        story:
          'As the team, we want the hero journey and its two proof points to run end to end in CI, so that the demo we present is the product we test.',
        acceptance: [
          "Given E2E #1, when it runs, then an OA approval travels through the tasks, the draft record, activation, reconciliation with HQ, the leave mapping and HQ's report to the overview, each step named with its owning area.",
          'Given E2E #2, when an unfamiliar subsidiary CSV is uploaded, then the AI suggestions approved by HR are saved as a mapping version and import the file with no code change.',
          'Given E2E #3, when HQ HR asks for a field missing from its allowlist through the UI, the raw API or a report export, then it is refused each time and each refusal is audited.',
          'Given a step whose story is not done, when the suite runs, then the step is marked fixme with the story key, never deleted.',
        ],
      },
    ],
  },
  {
    key: 'A',
    title: 'Connector hub',
    area: AREA[1],
    labels: ['req: M4 best practices'],
    goal: "Each of Organisation E's systems plugs in behind one connector interface, so data flows between Singapore and HQ without CSV exports.",
    stories: [
      {
        key: 'A-1',
        title: 'Sync SG HR employees into HuiTong',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          'As a Singapore HR executive, I want SG HR records to flow into HuiTong on demand, so that I stop re-keying them into Excel.',
        acceptance: [
          'Given SG HR, when I preview a sync, then I see what would change and nothing is written.',
          'Given a recent preview, when I apply it, then the records are created or updated and every change is audited.',
          'Given an unchanged source, when the same sync runs twice, then the second run changes nothing.',
          'Given an apply request without a preview, when it reaches the API, then it is refused.',
        ],
      },
      {
        key: 'A-2',
        title: 'Sync CN HQ (SAP) records with Chinese fields',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          'As a China HQ HR partner, I want HQ records with Chinese field names and YYYY/MM/DD dates mapped into the same master, so that HQ and Singapore see one consistent record.',
        acceptance: [
          'Given CN HQ, when a sync runs, then 部门 and SAP status codes become canonical values.',
          "Given a field owned by SG HR, when HQ holds a different value, then the master keeps the owner's value and records HQ's as provenance.",
          'Given a field with no single owner, when the systems disagree, then a conflict opens for HR.',
        ],
      },
      {
        key: 'A-3',
        title: 'Receive OA approval webhooks safely',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        labels: ['req: M4 best practices'],
        story:
          'As the workflow area, I want approved OA requests delivered as a verified event, so that recruitment can start without anyone copying approvals by hand.',
        acceptance: [
          'Given an OA delivery, when its HMAC signature or timestamp is wrong, then it is refused and audited, and nothing is stored.',
          'Given the same event twice, when it arrives again, then it is stored once.',
          'Given a subscriber, when an approval arrives, then `oa.approval.completed` is published and the event marked processed.',
        ],
      },
      {
        key: 'A-4',
        title: 'Connectors page: status, health, settings, mapping versions and history',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-connectors-page',
        story:
          'As an HR user, I want to see each connected system, its health and its sync history, so that I know whether the master is up to date.',
        acceptance: [
          'Given the connectors page, when it loads, then each system shows its status, last sync, health and mapping version.',
          'Given a connector, when I check its health, then the result is shown and audited.',
          'Given a connector, when I open it, then I see its non-secret settings, where its credentials are kept, and every mapping version.',
        ],
      },
      {
        key: 'A-5',
        title: 'Import a new subsidiary file through its approved mapping',
        sprint: 6,
        points: 8,
        priority: 'should',
        story:
          "As an HR executive, I want to import a new subsidiary's export with the mapping I approved, so that a new market joins the master without code changes.",
        acceptance: [
          'Given an approved mapping for a file connector, when I upload the full export, then I see a preview of the records it would create.',
          'Given the preview, when I apply it, then the records join the master with that connector as their source.',
          'Given a column with national ID numbers, when the file is read, then it is never stored.',
          'Given the imported records, when HR in another entity reads them, then only the fields an ACTIVE transfer register entry shares with that entity are shown (B-7).',
        ],
      },
      {
        key: 'A-6',
        title: '3D integration map driven by live sync events',
        sprint: 4,
        points: 8,
        priority: 'should',
        done: true,
        deliveredBy: 'feat/integration-map-scene',
        story:
          'As a manager, I want to see the connected systems and data flowing between them, so that I understand the integration at a glance.',
        acceptance: [
          'Given the integration map, when a sync runs, then its flow lights up and the node shows its status.',
          'Given reduced motion, when the page opens, then a still frame is shown instead of the animation.',
          'Given a keyboard user, when they tab beside the scene, then a list of nodes offers the same navigation.',
        ],
      },
      {
        key: 'A-7',
        title: 'Read Chinese CSV encodings safely',
        sprint: 1,
        points: 3,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-csv-encodings',
        story:
          'As a China HQ HR partner, I want files saved from Chinese Excel to read correctly whatever their encoding, so that headers and names are never garbled.',
        acceptance: [
          'Given a CSV in UTF-8, UTF-8 with a byte-order mark, GBK or GB18030, when it is uploaded, then its Chinese headers and values read correctly.',
          'Given a file whose encoding cannot be told apart, when it is uploaded, then I see both readings and choose one before anything is proposed.',
          'Given a new source, when a developer connects it, then the date formats, time zones and effective dates of every system are documented in one place.',
        ],
      },
      {
        key: 'A-8',
        title: 'Label mocked systems and the mock AI',
        sprint: 1,
        points: 2,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-mock-labels',
        labels: ['req: M2 GRS by design'],
        story:
          'As someone watching the demo, I want to see which systems are mocked and when the AI is the deterministic mock, so that nothing simulated passes for a live integration.',
        acceptance: [
          'Given a connector backed by a mock system, when it appears on the connectors pages or the overview, then it carries a "Mock" badge.',
          'Given the mock AI provider, when the mapping wizard or the discrepancy explainer shows its output, then it is labelled "Mock AI".',
          'Given a demo on a real model, when the team prepares it, then the docs say how to switch the provider and what changes.',
        ],
      },
    ],
  },
  {
    key: 'B',
    title: 'Canonical employee master',
    area: AREA[1],
    labels: ['req: M2 GRS by design'],
    goal: 'One trusted record per employee, with the source of every field, its history and the conflicts between systems.',
    stories: [
      {
        key: 'B-1',
        title: 'One record per employee with field provenance',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          'As an HR executive, I want one record per employee that says where each field came from, so that I can trust and explain the data.',
        acceptance: [
          'Given a record, when I open it, then every field shows each system value beside the master value and its source of truth.',
          'Given a change from a sync, when it is applied, then the record history shows the old value, the new value and the source.',
        ],
      },
      {
        key: 'B-2',
        title: 'Resolve conflicts between systems with an audited decision',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As an HR executive, I want to choose which system is right when they disagree, so that the master is correct and later syncs keep my decision.',
        acceptance: [
          'Given an open conflict, when I keep one system value, then that system becomes the source of truth for the field on that record.',
          'Given a typed value, when I save it without a note, then it is refused.',
          'Given a decision, when it is saved, then the audit log records it, and a later sync does not reopen the conflict.',
        ],
      },
      {
        key: 'B-3',
        title: 'Employees page: search, filters and the record drawer',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As an HR executive, I want to find any employee and see their record beside every source, masked for my role, so that I can answer questions in seconds.',
        acceptance: [
          'Given the list, when I search by name, number or email or filter by entity, department or status, then the results update and the filters stay in the URL.',
          'Given a field my role may not see, when it is shown, then it is masked with a "why is this hidden" explanation.',
          'Given the record drawer, when I open History, then every change appears with who or what made it.',
        ],
      },
      {
        key: 'B-4',
        title: 'Run a sync from the Employees page with live progress',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As an HR executive, I want to preview and apply a sync with live progress, so that I control when the master changes.',
        acceptance: [
          'Given the Run sync dialog, when I preview, then progress updates live and the changes are listed before anything is written.',
          'Given a preview with changes, when I slide (or tap twice) to apply, then exactly the previewed changes are written.',
          'Given a sync that finds conflicts, when it finishes, then a link takes me to the conflicts queue.',
        ],
      },
      {
        key: 'B-5',
        title: 'Possible matches for HR review, never name-only merges',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-possible-matches',
        labels: ['req: M2 GRS by design'],
        story:
          'As an HR executive, I want look-alike names flagged as possible matches for me to decide, so that two different people are never merged and one person is never split by accident.',
        acceptance: [
          'Given two people whose Chinese or romanised names look alike, when their records sync, then they stay separate records.',
          'Given a new record whose name looks like an existing employee, when I preview the sync, then that employee is shown as a possible match, and nothing is merged.',
          'Given the same group employee number from two systems, when the records arrive, then they are confirmed as one person.',
        ],
      },
      {
        key: 'B-6',
        title: 'Draft records and verified activation',
        sprint: 9,
        points: 5,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          'As an HR executive, I want an approved request to create only a draft record, which becomes active once onboarding and the verified HR record agree, so that nobody counts as an employee too early.',
        acceptance: [
          'Given an approved manpower request, when the hire is confirmed, then the master holds a PRE_HIRE draft linked to the request, and no active record exists.',
          'Given a draft, when the verified SG HR record arrives before the onboarding milestones are met, then it stays a draft and shows what it is waiting for.',
          'Given both conditions met, when the record becomes active, then the activation is audited with both pieces of evidence.',
          "Given a write-back to a system of record, when it is requested, then it needs HR's explicit, audited approval, and runs only against a mock until the client approves it.",
        ],
      },
      {
        key: 'B-7',
        title: 'Per-destination field allowlist, enforced by default deny',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-destination-allowlist',
        labels: ['req: M2 GRS by design', 'type: security'],
        story:
          'As a data protection officer, I want each destination to receive only the fields allowlisted for it, so that HQ never sees Singapore data that no approved transfer covers.',
        acceptance: [
          "Given a field missing from HQ's allowlist, when HQ HR reads a Singapore record in the UI or through the raw API, then the field is withheld with the reason.",
          'Given the allowlist, when it is worked out, then it comes from the ACTIVE entries of the cross-border transfer register, not from a second list.',
          'Given a response that withholds fields from a destination, when it is sent, then the audit log records which fields were withheld and under which policy version.',
          'Given a report export, when area 3 builds it, then the same allowlist service leaves out every field not listed.',
        ],
      },
    ],
  },
  {
    key: 'E',
    title: 'AI assistance with a human in the loop',
    area: AREA[1],
    labels: ['req: M3 AI-assisted coding', 'req: M2 GRS by design'],
    goal: 'AI proposes and explains; HR decides. No AI output reaches a system of record without approval, and every call is costed.',
    stories: [
      {
        key: 'E-1',
        title: 'AI schema-mapping assistant',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          "As an HR executive, I want the AI to propose how a new system's columns map to the master, with a confidence and a reason for each, so that connecting a subsidiary takes a day, not weeks.",
        acceptance: [
          'Given a sample CSV or Excel file with Chinese headers, when I upload it, then each column gets a proposed field, a transform, a confidence and a rationale.',
          'Given a column of national ID numbers, when the file is read, then it is flagged as prohibited and can never be mapped.',
          'Given the AI call, when it completes, then its tokens, latency and cost are recorded, and no personal value from the sample is sent or stored.',
        ],
      },
      {
        key: 'E-2',
        title: 'Mapping wizard with explicit approval and versions',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-connectors-page',
        story:
          'As an HR executive, I want to review, edit and explicitly approve a proposed mapping, so that nothing the AI suggests is used until I agree.',
        acceptance: [
          'Given a proposal, when I change a target or drop a constant, then the wizard shows problems such as a field mapped twice before I can approve.',
          'Given my approval, when I confirm, then a new mapping version is saved and the old one archived, with my name and the number of edits audited.',
          'Given a rejection, when I give a reason, then no mapping is saved and the AI call is marked rejected.',
        ],
      },
      {
        key: 'E-3',
        title: 'AI discrepancy explainer in English and Chinese',
        sprint: 1,
        points: 3,
        priority: 'should',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As a China HQ HR partner, I want a plain-language explanation of why two systems disagree, in Chinese if I prefer, so that I can decide faster.',
        acceptance: [
          'Given a conflict, when I ask for an explanation, then it appears in my language, labelled as advice that needs my decision.',
          'Given a field above Internal, when the prompt is built, then its values never reach the model.',
        ],
      },
      {
        key: 'E-4',
        title: 'Run the assistants on AWS Bedrock',
        sprint: 12,
        points: 5,
        priority: 'should',
        story:
          'As the team, we want the assistants to run on a real model through the same gateway, so that the demo shows production behaviour and real costs.',
        acceptance: [
          'Given LLM_PROVIDER=bedrock, when a proposal is requested, then the same contract is met and the usage record carries the real token counts.',
          'Given malformed model output, when it arrives, then it is rejected as AI_OUTPUT_INVALID and nothing is saved.',
        ],
      },
      {
        key: 'E-5',
        title: 'No employee identifiers sent to an AI service',
        sprint: 1,
        points: 2,
        priority: 'must',
        done: true,
        deliveredBy: 'fix/area1-ai-no-identifiers',
        labels: ['req: M2 GRS by design'],
        story:
          'As Organisation E, we want no employee identifier or sensitive HR value sent to an outside AI service without our written permission, so that using AI never becomes a data transfer we did not agree to.',
        acceptance: [
          'Given a conflict, when the explainer prompt is built, then it holds no employee number, name, email or phone number, and no value above INTERNAL.',
          'Given the mapping assistant, when its prompt is built, then it holds headers and category codes only, never a personal value.',
          'Given the rule, when anyone reads CLAUDE.md or the GRS register, then it is written there.',
        ],
      },
    ],
  },
  {
    key: 'C',
    title: 'Workflow automation',
    area: AREA[2],
    labels: ['req: M4 best practices'],
    goal: 'An approved manpower request in OA triggers recruitment, onboarding, the employee record and admin preparation, with nobody re-keying data.',
    stories: [
      {
        key: 'C-1',
        title: 'Start a recruitment requisition from an OA approval',
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          'As a hiring manager, I want my approved manpower request to open a requisition automatically, so that hiring starts the same day.',
        acceptance: [
          'Given an `oa.approval.completed` event for a manpower request, when it is handled, then one requisition is created, even if the event arrives twice.',
          'Given a rejected request, when the event arrives, then no requisition is created and the outcome is recorded.',
        ],
      },
      {
        key: 'C-2',
        title: 'Workflow state machine from hire to day one',
        sprint: 8,
        points: 8,
        priority: 'must',
        labels: ['req: M4 best practices'],
        story:
          'As an HR executive, I want each hire to move through clear stages with retries, so that onboarding never stalls silently.',
        acceptance: [
          'Given a workflow, when a step fails, then it is retried with backoff and, after the last attempt, flagged for a person.',
          'Given an invalid transition, when it is requested, then it is refused by the state machine.',
          'Given the state machine, when its unit tests run, then line coverage is at least 80%.',
        ],
      },
      {
        key: 'C-3',
        title: 'Create the employee record on hire',
        sprint: 9,
        points: 5,
        priority: 'must',
        story:
          'As an HR executive, I want the new hire created from the approved data, as a draft in the master and in SG HR once I approve it, so that I type it once.',
        acceptance: [
          'Given a confirmed hire, when the step runs, then a draft (PRE_HIRE) record appears in the master with the workflow as the change source (B-6).',
          "Given the SG HR mock, when the record is pushed after HR's explicit approval, then the call is idempotent, audited and labelled as a write-back to a mock.",
        ],
      },
      {
        key: 'C-4',
        title: 'Admin preparation tasks with SLA reminders',
        sprint: 9,
        points: 5,
        priority: 'should',
        story:
          'As an admin operations officer, I want laptop, desk and account tasks assigned to me with due dates, so that the new hire is ready on day one.',
        acceptance: [
          'Given a hire, when onboarding starts, then admin tasks are created for ADMIN_OPS with due dates.',
          'Given an overdue task, when its SLA passes, then a reminder and then an escalation are sent.',
        ],
      },
      {
        key: 'C-5',
        title: 'Notify people in Teams or DingTalk (mocked)',
        sprint: 10,
        points: 3,
        priority: 'could',
        story:
          'As a hiring manager, I want status updates where I already work, so that I do not have to check HuiTong.',
        acceptance: [
          'Given a workflow step, when it completes, then a message is sent to the mocked Teams or DingTalk channel for the entity.',
          'Given a failed delivery, when it is retried, then the same message is not sent twice.',
        ],
      },
      {
        key: 'C-6',
        title: 'Workflow board',
        sprint: 10,
        points: 5,
        priority: 'must',
        story:
          'As an HR executive, I want a board of every hire by stage, so that I see where each one stands.',
        acceptance: [
          'Given the board, when it loads, then each workflow appears in its stage with its next action and owner.',
          'Given a task assigned to me, when I complete it, then the workflow moves on and the change is audited.',
        ],
      },
    ],
  },
  {
    key: 'D',
    title: 'Attendance and leave consolidation',
    area: AREA[3],
    labels: ['req: M4 best practices'],
    goal: 'Attendance and leave from Singapore and HQ consolidate into the company template automatically, with exceptions explained.',
    stories: [
      {
        key: 'D-1',
        title: 'Ingest attendance and leave from SG HR and CN HQ',
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          "As a Singapore HR executive, I want a month's attendance and leave pulled from both systems, so that I stop exporting and merging CSV files.",
        acceptance: [
          'Given a month, when ingestion runs, then records from both systems are stored with their source category.',
          'Given a record for an unknown employee, when it is read, then it is reported as an exception, not dropped.',
        ],
      },
      {
        key: 'D-2',
        title: 'Map leave categories between systems',
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          'As an HR executive, I want rules that map 年假 to Annual Leave, 病假 to Sick Leave and 调休 to time off in lieu, so that both systems count the same way.',
        acceptance: [
          "Given CN HQ's 年假, 病假 and 调休, when records are consolidated, then they become Annual Leave, Sick Leave and time off in lieu.",
          'Given a category with an approved rule, when records are consolidated, then they carry the canonical category.',
          'Given a category with no rule, when it appears, then it is listed for HR to map, and nothing is guessed.',
        ],
      },
      {
        key: 'D-3',
        title: 'Validate and report exceptions',
        sprint: 9,
        points: 3,
        priority: 'must',
        story:
          'As an HR executive, I want overlaps, missing days and impossible values flagged, so that I fix them before the report goes out.',
        acceptance: [
          'Given overlapping leave, when validation runs, then the overlap is reported with both records.',
          'Given the exception report, when I open it, then each exception explains what is wrong and where it came from.',
        ],
      },
      {
        key: 'D-4',
        title: 'Render the company template and export .xlsx',
        sprint: 10,
        points: 8,
        priority: 'must',
        story:
          'As an HR executive, I want the month in the company reporting template as an Excel file, so that I can send it without reformatting.',
        acceptance: [
          'Given a consolidated month, when I export, then the .xlsx follows the template layout exactly.',
          'Given a destination such as HQ, when it exports, then the file holds only the fields on its allowlist (B-7), and the export is audited.',
        ],
      },
      {
        key: 'D-5',
        title: 'Management reports from several sources',
        sprint: 11,
        points: 5,
        priority: 'should',
        story:
          'As a manager, I want headcount, leave and attendance reports that combine both entities, so that I see the whole operation.',
        acceptance: [
          'Given the reports page, when it loads, then each figure names the systems it was drawn from.',
          'Given the MANAGEMENT role, when it opens a report, then it is read-only and shows no restricted fields.',
        ],
      },
    ],
  },
  {
    key: 'F',
    title: 'Governance and compliance',
    area: AREA[4],
    labels: ['req: M2 GRS by design'],
    goal: 'Access, audit, classification, cross-border transfers and retention are visible and administered, in line with PDPA and PIPL.',
    stories: [
      {
        key: 'F-1',
        title: 'Administer roles and field masking',
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          'As a system administrator, I want to see and change what each role may see, so that access follows policy without code changes.',
        acceptance: [
          'Given the access screen, when I change a clearance rule, then masking follows on the next request and the change is audited.',
          'Given separation of duties, when an administrator tries to resolve an HR conflict, then it is refused.',
        ],
      },
      {
        key: 'F-2',
        title: 'Audit-log viewer',
        sprint: 9,
        points: 5,
        priority: 'must',
        story:
          'As an auditor, I want to search the audit log by record, person and action, so that I can trace any change.',
        acceptance: [
          'Given `/governance/audit?entityType=Employee&entityId=E100030`, when it opens, then every event for that record is listed.',
          'Given the audit chain, when it is checked, then any altered event is detected.',
        ],
      },
      {
        key: 'F-3',
        title: 'Data classification register',
        sprint: 9,
        points: 3,
        priority: 'should',
        story:
          'As a data protection officer, I want every field classified with its reason, so that masking and transfers follow a published register.',
        acceptance: [
          'Given the register, when it loads, then every canonical field shows its classification and who may see it.',
        ],
      },
      {
        key: 'F-4',
        title: 'Cross-border transfer register (PDPA and PIPL)',
        sprint: 10,
        points: 5,
        priority: 'must',
        story:
          'As a system administrator, I want each cross-border flow recorded with its legal basis and approval, so that no personal data leaves Singapore without one.',
        acceptance: [
          'Given a pending transfer, when it is approved, then the fields it covers become visible to HQ roles, and the approval is audited.',
          'Given a field with no approved transfer, when HQ reads it, then it is masked as not approved.',
          'Given a change to the fields a transfer covers, when it is saved, then the policy version goes up and the change is audited with who made it.',
        ],
      },
      {
        key: 'F-5',
        title: 'Retention settings and purge',
        sprint: 11,
        points: 3,
        priority: 'could',
        story:
          'As a data protection officer, I want retention periods per data type with a scheduled purge, so that we keep data no longer than needed.',
        acceptance: [
          'Given a retention period, when data passes it, then the purge job removes or anonymises it and records what it did.',
        ],
      },
      {
        key: 'F-6',
        title: 'OWASP Top 10 and API Security Top 10 checklist',
        sprint: 12,
        points: 3,
        priority: 'must',
        labels: ['req: M4 best practices', 'type: security'],
        story:
          'As the team, we want each OWASP risk checked against our controls with evidence, so that we can show security by design at the technical review.',
        acceptance: [
          'Given the checklist, when it is read, then each OWASP category links to the control, the code and a test or scan result.',
        ],
      },
    ],
  },
  {
    key: 'G',
    title: 'Monitoring and analytics',
    area: AREA[4],
    labels: ['req: M6 deploy and monitor'],
    goal: 'The deployed demo is observable, its use is measured with consent, and every AI call is costed, each with an in-app dashboard.',
    stories: [
      {
        key: 'G-1',
        title: 'Observability: traces, metrics and dashboards',
        sprint: 14,
        points: 8,
        priority: 'must',
        story:
          'As an operator, I want traces, metrics and health on a dashboard, so that I can find a slow or failing request quickly.',
        acceptance: [
          'Given a request, when it fails, then its trace id links the browser error, the API log and the trace.',
          'Given `/metrics`, when Prometheus scrapes it, then request rates, latencies and queue depths are exposed.',
        ],
      },
      {
        key: 'G-2',
        title: 'First-party clickstream analytics with consent',
        sprint: 15,
        points: 5,
        priority: 'must',
        story:
          'As the product team, we want to see how HR uses each screen, with their consent, so that we improve what matters.',
        acceptance: [
          'Given no consent, when a user navigates, then no event is recorded.',
          'Given consent, when a user navigates, then the route pattern, never the concrete URL, is recorded and shown on the analytics dashboard.',
        ],
      },
      {
        key: 'G-3',
        title: 'AI token usage and cost dashboard',
        sprint: 16,
        points: 5,
        priority: 'must',
        story:
          'As the team lead, I want AI tokens, latency and cost per feature and user on a dashboard, so that AI use stays affordable and accountable.',
        acceptance: [
          'Given the AI usage dashboard, when it loads, then it shows tokens, cost and outcome by feature, day and user.',
          'Given a rejected AI proposal, when it is counted, then it appears as rejected, not as accepted.',
        ],
      },
      {
        key: 'G-4',
        title: 'Deploy the demo on AWS with CloudWatch',
        sprint: 17,
        points: 8,
        priority: 'must',
        story:
          'As the team, we want HuiTong deployed on AWS with logs and alarms in CloudWatch, so that the client and assessors can use it.',
        acceptance: [
          'Given the deployment guide, when it is followed, then the web, API and mocks run on AWS behind HTTPS.',
          'Given an unhealthy service, when CloudWatch detects it, then an alarm fires.',
        ],
      },
      {
        key: 'G-5',
        title: 'DAST against the deployed demo',
        sprint: 17,
        points: 3,
        priority: 'should',
        labels: ['type: security'],
        story:
          'As the team, we want an OWASP ZAP baseline scan of the running demo, so that misconfigurations SAST cannot see are found too.',
        acceptance: [
          'Given the deployed demo, when the ZAP baseline runs in CI, then its report is kept and High findings fail the job.',
        ],
      },
    ],
  },
  {
    key: 'T',
    title: 'Assessments, client sessions and team',
    area: AREA.team,
    labels: ['req: M1 design thinking'],
    goal: 'Every assessment and client touchpoint is planned as work, so that each member is ready to show and explain their part.',
    stories: [
      {
        key: 'T-1',
        title: 'Agree area owners and fill CODEOWNERS',
        sprint: 3,
        points: 1,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want each of areas 2 to 4 to have one owner, so that every member owns, writes and explains distinct code.',
        acceptance: [
          'Given the team agreement, when it is recorded, then docs/team/module-ownership.md names the owner and the backup owner of each area.',
          'Given CODEOWNERS, when a pull request touches an area, then its owner is asked to review.',
        ],
      },
      {
        key: 'T-2',
        title: 'First client session',
        sprint: 2,
        points: 3,
        priority: 'must',
        type: 'type: task',
        labels: ['status: needs client input'],
        story:
          'As the team, we want the open questions answered by Organisation E, so that our assumptions become facts.',
        acceptance: [
          'Given the three sample packs in docs/client/questions-for-client.md, when the session is arranged, then they are requested first.',
          'Given docs/client/questions-for-client.md, when the session ends, then each question has an answer or a follow-up.',
          'Given the answers, when they are recorded, then the affected assumptions are confirmed or changed.',
        ],
      },
      {
        key: 'T-3',
        title: 'Project plan (W3)',
        sprint: 3,
        points: 2,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want a project plan with sprints, owners and risks, so that the lecturer and the client see how we will deliver.',
        acceptance: [
          'Given the plan, when it is submitted, then it shows the sprint calendar, the area owners and the top risks.',
        ],
      },
      {
        key: 'T-4',
        title: 'UI prototype (W4)',
        sprint: 4,
        points: 5,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want a clickable prototype of every area, so that the client can react before we build.',
        acceptance: [
          'Given the prototype, when the client walks through it, then each journey from the journey maps can be followed.',
        ],
      },
      {
        key: 'T-5',
        title: 'Proposal presentation (W5, 25%)',
        sprint: 5,
        points: 5,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want a proposal that ties the problem to our solution, GRS and plan, so that we score well and get client buy-in.',
        acceptance: [
          'Given the deck, when it is presented, then each member presents their own area within the time limit.',
        ],
      },
      {
        key: 'T-6',
        title: 'Mock job interview preparation (W7, 15%)',
        sprint: 7,
        points: 3,
        priority: 'must',
        type: 'type: task',
        story:
          'As a team member, I want to rehearse explaining my own code and decisions, so that I can answer any question about my part.',
        acceptance: [
          'Given my area, when a teammate asks about any file I own, then I can explain what it does, why, and how it is tested.',
        ],
      },
      {
        key: 'T-7',
        title: 'Technical review (W13, 25%)',
        sprint: 13,
        points: 5,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want a technical review that demonstrates working code, tests and security, so that the assessors see best practice.',
        acceptance: [
          'Given the review, when each member demos, then they show their tests passing in CI and the traceability rows for their area.',
        ],
      },
      {
        key: 'T-8',
        title: 'Final presentation (W18, 35%)',
        sprint: 18,
        points: 8,
        priority: 'must',
        type: 'type: task',
        story:
          'As the team, we want a final presentation of the deployed product with its monitoring, so that we show the full journey.',
        acceptance: [
          "Given the deployed demo, when it is presented, then the hero journey runs live end to end, and each member presents their own area's steps (docs/agile/hero-journey.md).",
        ],
      },
      {
        key: 'T-9',
        title: 'Client check-in and handover (W19)',
        sprint: 19,
        points: 2,
        priority: 'should',
        type: 'type: task',
        story:
          'As the team, we want to hand over what we built with its documentation, so that Organisation E can take it further.',
        acceptance: [
          'Given the handover, when it is done, then the client has the repository guide, the architecture and the open questions.',
        ],
      },
    ],
  },
];
