// The product backlog as data: sprints, epics and user stories with acceptance
// criteria. `seed-backlog.mjs` creates them in GitHub (milestones, issues,
// sub-issues) and `render-backlog.mjs` writes docs/agile/backlog.md from it,
// so the plan is reviewed in a pull request before anything is created.
// Stories already delivered name the branch that delivered them (`deliveredBy`).
// Keys are never reused: GitHub issues are matched by key, so a story whose
// title changes keeps its issue, and a dropped story's key moves to RETIRED.

const AREA = {
  1: 'area: 1 integration core',
  2: 'area: 2 capture and verification',
  3: 'area: 3 competency and submissions',
  4: 'area: 4 governance and monitoring',
  team: 'area: team',
};

/** Sprint n runs Monday to Sunday of module week n, from W1 = 19 Oct 2026. */
export const SPRINTS = [
  { number: 1, goal: 'Platform base, security scanning and the Agile workflow in GitHub' },
  {
    number: 2,
    goal: "Problem allocation; retarget the project to #5 (ASPRI-IPI), the team's first choice; the TMS and agency mocks",
  },
  {
    number: 3,
    goal: 'Briefing call with ASPRI-IPI; project plan; backup owners agreed; answers folded into the backlog',
  },
  { number: 4, goal: 'UI prototype across every area, the tablet checklist first' },
  { number: 5, goal: 'Proposal presentation (25%)' },
  { number: 6, goal: 'Backlog refinement; area owners start their core logic' },
  { number: 7, goal: 'Mock job interview (15%): each member explains their own code' },
  {
    number: 8,
    goal: 'AI-assisted coding: the state machine, course rules, competency and access cores',
  },
  {
    number: 9,
    goal: 'AI-assisted coding: the tablet checklist, verification, submission files and the TMS write',
  },
  {
    number: 10,
    goal: 'AI-assisted coding: offline sync, corrections, agency submissions and the rule-drafting assistant',
  },
  {
    number: 11,
    goal: 'AI-assisted coding: reminders, dashboards, audit readiness and the end-to-end journeys',
  },
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
          'Given the docs, when a reviewer reads them, then personas, journey maps, how-might-we statements and success metrics are there.',
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
          'As a user of HuiTong, I want to sign in safely and see only the data my role allows, so that personal data is protected from the first screen.',
        acceptance: [
          'Given a password sign-in, when the password is wrong, then the response takes as long as for an unknown email and reveals neither.',
          'Given a role without clearance, when it reads a restricted field, then the value comes back masked with the reason.',
          'Given any write, when it succeeds, then an append-only audit event records who, what and when.',
          'Given the mock external systems, when they start, then they serve synthetic data in their own schemas.',
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
          'As a user, I want a calm, bilingual app shell with an overview of sync health and my queues, so that I know what needs me as soon as I sign in.',
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
        sprint: 3,
        points: 8,
        priority: 'must',
        story:
          'As an area owner, I want a guide to my area for statement #5 and, if I ask for it, my head start reworked for #5, so that I can start on my core logic in week 6.',
        acceptance: [
          "Given each of areas 2 to 4, when the owner opens docs/team/, then a guide explains the area's #5 scope, what its folders hold today, what to change first, and its interfaces and stories.",
          "Given an owner who asks for a reworked head start (scaffolding, data models, contracts, typed sample data, screens and test skeletons), when it is delivered, then it comes in one pull request for that area, reviewed by the owner, and changes none of the owner's own code.",
          "Given an owner who reworks the head start themselves, when the guide is merged, then nobody else changes that area's folders.",
          'Given a shared contract (roles, events, schemas) that #5 needs, when it is added, then no existing consumer breaks.',
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
        points: 8,
        priority: 'must',
        labels: ['req: M4 best practices'],
        story:
          'As the team, we want the hero journey and its two proof points to run end to end in CI, so that the demo we present is the product we test.',
        acceptance: [
          'Given E2E #1, when it runs, then an assessor records a run on a tablet (one record syncs after a dropped connection), the competency is calculated, operations verifies the run and corrects one result with a reason, the results reach the TMS mock, one agency receives them through its API and another as a validated file, the dashboard shows their status and the audit trail shows every step, each step named with its owning area.',
          'Given E2E #2, when a new course\'s assessment plan is uploaded, then the AI\'s draft rules carry the "Mock AI" badge, a training manager approves them, and the next run uses them with no code change.',
          "Given E2E #3, when a submission would carry a field missing from the agency's allowlist, through the UI, the raw API or a file, then the agency never receives it and each denial is audited.",
          'Given a step whose story is not done, when the suite runs, then the step is marked fixme with the story key, never deleted.',
        ],
      },
      {
        key: 'P-10',
        title: 'Overview: runs, verification, the TMS and submissions',
        sprint: 3,
        points: 5,
        priority: 'must',
        story:
          "As an operations executive, I want the overview to show this week's runs, the verification queue, the TMS sync and the submissions due, so that I know what needs me as soon as I sign in.",
        acceptance: [
          "Given the overview, when it loads, then it shows the week's runs by state, the runs waiting for verification, the TMS connector's health and the submissions near their deadline, each linking to its page.",
          'Given a connector that is down, when the overview loads, then it says which figures may be out of date.',
          'Given an area whose summary is not built yet, when the overview loads, then its tile says so instead of showing a number.',
          'Given the mock systems, when they appear on the overview, then each carries the "Mock" badge.',
        ],
      },
    ],
  },
  {
    key: 'A',
    title: 'Connector hub',
    area: AREA[1],
    labels: ['req: M4 best practices'],
    goal: 'The TMS and each agency plug in behind one connector interface: the TMS through its API or its exports, and an agency through its API where it has one and otherwise through a generated file delivered to its portal, with the status of every submission tracked.',
    stories: [
      {
        key: 'A-1',
        title: 'Sync a source system with preview and apply',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          "As the person who keeps a system's records in step, I want every sync previewed before it writes, so that nothing changes in HuiTong without my say.",
        acceptance: [
          'Given a connected system, when I preview a sync, then I see what would change and nothing is written.',
          'Given a recent preview, when I apply it, then the records are created or updated and every change is audited.',
          'Given an unchanged source, when the same sync runs twice, then the second run changes nothing.',
          'Given an apply request without a preview, when it reaches the API, then it is refused.',
        ],
      },
      {
        key: 'A-2',
        title: "Map a source's own field names, codes and dates",
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          'As the team connecting a system, we want its field names, codes and date formats mapped into canonical fields, so that each system keeps its own schema and nobody converts values by hand.',
        acceptance: [
          'Given a source with Chinese field names, YYYY/MM/DD dates and its own status codes, when a sync runs, then they become canonical fields and values.',
          "Given a field another source owns, when this source holds a different value, then the master keeps the owner's value and records this one as provenance.",
          'Given a field with no single owner, when the sources disagree, then a conflict opens for review.',
        ],
      },
      {
        key: 'A-3',
        title: 'Receive signed webhooks safely',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        labels: ['req: M4 best practices'],
        story:
          "As the team, we want an outside system's events accepted only when they are signed and new, so that a forged or replayed event never changes anything.",
        acceptance: [
          'Given a delivery, when its HMAC signature or timestamp is wrong, then it is refused and audited, and nothing is stored.',
          'Given the same event twice, when it arrives again, then it is stored once.',
          'Given a subscriber, when an event arrives, then a domain event is published and the stored event marked processed.',
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
          'As a user who depends on the connected systems, I want to see each one, its health and its sync history, so that I know whether HuiTong is up to date.',
        acceptance: [
          'Given the connectors page, when it loads, then each system shows its status, last sync, health and mapping version.',
          'Given a connector, when I check its health, then the result is shown and audited.',
          'Given a connector, when I open it, then I see its non-secret settings, where its credentials are kept, and every mapping version.',
        ],
      },
      {
        key: 'A-5',
        title: 'Import a file through its approved mapping',
        sprint: 6,
        points: 8,
        priority: 'should',
        done: true,
        deliveredBy: 'feat/area1-file-import',
        story:
          "As the team, we want a system's full export imported through the mapping a person approved, so that a new source joins HuiTong without code changes.",
        acceptance: [
          'Given an approved mapping for a file connector, when I upload the full export, then I see a preview of the records it would create.',
          'Given the preview, when I apply it, then the records join HuiTong with that connector as their source.',
          'Given a column with national ID numbers, when the file is read, then it is never stored.',
          'Given the imported records, when a user elsewhere reads them, then only the fields an ACTIVE allowlist entry shares are shown (B-7).',
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
          'As someone who uploads a file saved from Chinese-locale Excel, I want it read correctly whatever its encoding, so that headers and names are never garbled.',
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
      {
        key: 'A-13',
        title: 'Document the data formats; keep real samples out of git',
        sprint: 2,
        points: 3,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          "As a developer, I want the TMS's and each agency's formats written down, and a samples folder git ignores, so that the client's samples can be tried locally without ever reaching the public repository.",
        acceptance: [
          "Given docs/data-formats.md, when it is read, then the TMS's API and exports, each agency's API and each submission file have their file type, encoding, key fields, codes, date format, the mock that emulates them and the questions for the briefing call.",
          'Given a sample from the client, when it is copied into samples/, then git ignores it, and a check refuses a push that contains one.',
        ],
      },
      {
        key: 'A-14',
        title: 'TMS mock: courses, runs, trainees and results',
        sprint: 2,
        points: 8,
        priority: 'must',
        story:
          "As the team, we want a TMS mock that serves courses, runs, trainees and results through an API and CSV exports, so that capture, verification and submission can be built before we reach the client's TMS.",
        acceptance: [
          'Given the mock, when its API is called, then it serves synthetic process-industry courses, runs and enrolled trainees, each trainee with a TMS ID, at the volumes of assumption A-71.',
          'Given an export request, when it runs, then courses, runs and trainees come as CSV in the format docs/data-formats.md documents (A-13).',
          "Given verified results written to it, when the same write arrives again, then the mock stores them once and returns each result's TMS status.",
          'Given any screen that shows the mock, when it is displayed, then it is labelled "Mock".',
        ],
      },
      {
        key: 'A-15',
        title: 'Agency mocks: an API that acknowledges later, and a portal that validates files',
        sprint: 2,
        points: 8,
        priority: 'must',
        story:
          "As the team, we want an agency API mock that acknowledges a submission later and a portal mock that validates the MOM and ITE files, so that both submission routes are built and tested before we know each agency's channel.",
        acceptance: [
          'Given a submission to the agency API mock, when it is accepted, then the mock replies at once with a reference and later sends a signed acknowledgement that accepts or rejects each row (assumption A-65).',
          'Given a MOM or ITE file uploaded to the portal mock, when it is validated, then the mock returns a report of the rows accepted and rejected, with a reason for each rejected row (assumption A-66).',
          'Given the same submission twice, when it reaches either mock, then it is recognised as a duplicate and recorded once.',
          'Given any screen that shows an agency mock, when it is displayed, then it is labelled "Mock".',
        ],
      },
      {
        key: 'A-16',
        title: 'Read courses, runs and trainees from the TMS',
        sprint: 3,
        points: 8,
        priority: 'must',
        story:
          "As an operations executive, I want each week's runs, with their courses and enrolled trainees, read from the TMS, so that assessors find their runs on the tablet without anyone typing them in.",
        acceptance: [
          'Given the TMS connector, when a sync is previewed and applied, then courses, runs and trainees reach master data with the TMS as their source, through the preview, apply and audit of every sync (A-1).',
          'Given a TMS export instead of the API, when it is imported through its approved mapping, then the result is the same (A-5).',
          'Given a trainee, when the records are matched, then only the TMS trainee ID confirms a match, and a look-alike name is a possible match for review (B-5).',
          'Given the TMS is down, when a sync runs, then it retries with backoff and the overview says the data may be out of date.',
        ],
      },
      {
        key: 'A-17',
        title: 'Write verified results to the TMS after an approved preview',
        sprint: 9,
        points: 5,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          "As an operations executive, I want a run's verified results written to the TMS only after I approve a preview, so that the TMS becomes the single source of truth without anyone re-typing them.",
        acceptance: [
          'Given a verified run, when I preview the write, then I see each result as the TMS will receive it, and nothing is written.',
          'Given my approval of the preview, when the write runs, then exactly those results reach the TMS mock, once, and the write is audited and labelled as a write to a mock.',
          'Given a result that operations have not verified, when a write is requested, then it is refused.',
          "Given a row the TMS rejects, when the write finishes, then the row shows the TMS's reason and the run is not marked as in the TMS.",
        ],
      },
      {
        key: 'A-18',
        title: 'Submit results through an agency API and track each submission',
        sprint: 10,
        points: 8,
        priority: 'must',
        story:
          "As an operations executive, I want verified results submitted through an agency's API after I approve a preview, and each submission followed to its acknowledgement, so that I stop keying results into the portal.",
        acceptance: [
          'Given a verified run and an agency with an API, when I approve the preview, then one submission is sent with an idempotency key, and a retry never submits twice (GRS R-28).',
          "Given the agency's signed acknowledgement, when it arrives, then the submission becomes accepted, partly accepted or rejected, with each rejected row's reason (A-3).",
          'Given no acknowledgement by the deadline, when the SLA passes, then the submission is flagged for operations.',
          "Given the submission, when it is built, then it holds only the fields the agency's ACTIVE allowlist entries share (B-9).",
        ],
      },
      {
        key: 'A-19',
        title: "Deliver an agency's file and record the portal's validation report",
        sprint: 10,
        points: 5,
        priority: 'must',
        story:
          "As an operations executive, I want an agency's file delivered to its portal and the portal's validation report recorded against each trainee, so that I see which rows were accepted without reading the report myself.",
        acceptance: [
          "Given a file rendered from the agency's template (D-11) and approved by operations, when it is delivered, then the validation report is stored with the submission and each row's status shows against its trainee.",
          'Given a portal with no API, when a file is delivered, then operations upload it and attach the report; in the demo the portal mock does both, labelled "Mock".',
          'Given a rejected row, when it is corrected and resubmitted, then only that row is resubmitted, linked to the first submission.',
          'Given the same file delivered twice, when the second delivery runs, then it is recognised and recorded once.',
        ],
      },
      {
        key: 'A-20',
        title: 'Tenant configuration: another training provider joins by configuration',
        sprint: 6,
        points: 5,
        priority: 'should',
        story:
          'As another training provider, we want to join through a configuration of our name, connectors, field mappings, course rules and theme tokens, so that we reuse HuiTong without new code.',
        acceptance: [
          'Given a tenant configuration, when it is loaded, then its name, connector set, field mappings, course rules and theme tokens apply without code changes.',
          "Given a tenant's theme tokens, when the UI renders, then its colours follow and still meet the contrast rules.",
          "Given the default tenant, when the app starts, then it carries HuiTong's own identity; no client's brand is added without that client's permission (Q-62).",
        ],
      },
      {
        key: 'A-21',
        title: 'Integration map: from the tablets to the TMS and the agencies',
        sprint: 4,
        points: 5,
        priority: 'should',
        story:
          'As a manager, I want the integration map to show results flowing from the tablets through HuiTong to the TMS and each agency, so that I see at a glance where results stand.',
        acceptance: [
          'Given the map, when a tablet syncs, a write reaches the TMS or a submission reaches an agency, then that flow lights up and the node shows its status.',
          'Given an agency reached by file, when it is drawn, then it shows as a portal, distinct from an API.',
          'Given reduced motion or a keyboard user, when the page opens, then the still frame and the list of nodes from A-6 still apply.',
        ],
      },
    ],
  },
  {
    key: 'B',
    title: 'Master data',
    area: AREA[1],
    labels: ['req: M2 GRS by design'],
    goal: 'One trusted record per trainee, assessor, course and course run, with the source of every field, its history and the conflicts between systems; trainees are matched on the TMS trainee ID, never on names alone.',
    stories: [
      {
        key: 'B-1',
        title: 'One record per person with field provenance',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-integration-api',
        story:
          'As the person who checks the records, I want one record per person that says where each field came from, so that I can trust and explain the data.',
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
          'As the person who keeps the records right, I want to choose which system is right when they disagree, so that the master is correct and later syncs keep my decision.',
        acceptance: [
          'Given an open conflict, when I keep one system value, then that system becomes the source of truth for the field on that record.',
          'Given a typed value, when I save it without a note, then it is refused.',
          'Given a decision, when it is saved, then the audit log records it, and a later sync does not reopen the conflict.',
        ],
      },
      {
        key: 'B-3',
        title: 'Records page: search, filters and the record drawer',
        sprint: 1,
        points: 8,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As the person who answers questions about a record, I want to find any record and see it beside every source, masked for my role, so that I can answer in seconds.',
        acceptance: [
          'Given the list, when I search or filter, then the results update and the search and filters stay in the URL.',
          'Given a field my role may not see, when it is shown, then it is masked with a "why is this hidden" explanation.',
          'Given the record drawer, when I open History, then every change appears with who or what made it.',
        ],
      },
      {
        key: 'B-4',
        title: 'Run a sync with live progress',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-employees-page',
        story:
          'As the person who keeps the records in step, I want to preview and apply a sync with live progress, so that I control when the master changes.',
        acceptance: [
          'Given the Run sync dialog, when I preview, then progress updates live and the changes are listed before anything is written.',
          'Given a preview with changes, when I slide (or tap twice) to apply, then exactly the previewed changes are written.',
          'Given a sync that finds conflicts, when it finishes, then a link takes me to the conflicts queue.',
        ],
      },
      {
        key: 'B-5',
        title: 'Possible matches for review, never name-only merges',
        sprint: 1,
        points: 5,
        priority: 'must',
        done: true,
        deliveredBy: 'feat/area1-possible-matches',
        labels: ['req: M2 GRS by design'],
        story:
          'As the person who checks new records, I want look-alike names flagged as possible matches for me to decide, so that two different people are never merged and one person is never split by accident.',
        acceptance: [
          'Given two people whose Chinese or romanised names look alike, when their records sync, then they stay separate records.',
          "Given a new record whose name looks like an existing person's, when I preview the sync, then that person is shown as a possible match, and nothing is merged.",
          'Given the same identifier from two systems, when the records arrive, then they are confirmed as one person.',
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
          'As a data protection officer, I want each destination to receive only the fields allowlisted for it, so that nobody receives data that no approved entry covers.',
        acceptance: [
          "Given a field missing from a destination's allowlist, when a user of that destination reads a record in the UI or through the raw API, then the field is withheld with the reason.",
          'Given the allowlist, when it is worked out, then it comes from the ACTIVE entries of one register, not from a second list.',
          'Given a response that withholds fields, when it is sent, then the audit log records which fields were withheld and under which entry versions.',
          'Given an export, when it is built, then the same allowlist service names every field to leave out.',
        ],
      },
      {
        key: 'B-8',
        title: 'Trainees, assessors, courses and runs in master data',
        sprint: 3,
        points: 8,
        priority: 'must',
        story:
          'As an operations executive, I want one record per trainee, assessor, course and course run, each field with its source and history, so that every screen and submission draws on the same facts.',
        acceptance: [
          'Given the TMS connector, when it syncs, then trainees, assessors, courses and runs are stored with the TMS as the source of truth of each field it owns, and every change in their history.',
          'Given a trainee, when the record is stored, then it is keyed by the TMS trainee ID, and no national ID number is stored (assumptions A-68 and A-69).',
          'Given the trainees page, when I open a record, then contact details, the date of birth and results outside my own runs are masked for my role, with the reason.',
          "Given area 1's screens and routes, when this story is done, then none of them still speaks of employees.",
        ],
      },
      {
        key: 'B-9',
        title: 'Each agency receives only its allowlisted fields',
        sprint: 9,
        points: 5,
        priority: 'must',
        labels: ['req: M2 GRS by design', 'type: security'],
        story:
          "As ASPRI-IPI's data protection officer, I want each agency to receive only the fields an ACTIVE entry of its allowlist shares, so that no submission carries data the agency does not need.",
        acceptance: [
          "Given a submission to an agency, by API or by file, when it is built, then it holds only the fields the agency's ACTIVE allowlist entries share, and every other field is withheld (GR-04).",
          'Given a field withheld from a submission, when the submission is sent, then the audit log records the fields withheld and the entry versions.',
          'Given an agency with no ACTIVE entry, when a submission is requested, then it is refused with the reason.',
          'Given the allowlist, when it is worked out, then it reuses the register and the field masker from B-7, not a second mechanism.',
        ],
      },
    ],
  },
  {
    key: 'E',
    title: 'AI assistance with a human in the loop',
    area: AREA[1],
    labels: ['req: M3 AI-assisted coding', 'req: M2 GRS by design'],
    goal: 'AI proposes and explains; people decide. Every call goes through the LlmGateway and is costed, no trainee identifier or result reaches an outside AI service, and AI never changes a result. The rule-drafting assistant (D-10) and the verification assistant (C-15) follow the same pattern in their areas.',
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
          "As the person connecting a system, I want the AI to propose how its columns map to HuiTong's fields, with a confidence and a reason for each, so that connecting a system takes a day, not weeks.",
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
          'As the person connecting a system, I want to review, edit and explicitly approve a proposed mapping, so that nothing the AI suggests is used until I agree.',
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
          'As the person settling a conflict, I want a plain-language explanation of why two systems disagree, in Chinese if I prefer, so that I can decide faster.',
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
          'Given LLM_PROVIDER=bedrock, when an assistant is asked, then the same contract is met and the usage record carries the real token counts.',
          'Given malformed model output, when it arrives, then it is rejected as AI_OUTPUT_INVALID and nothing is saved.',
          'Given client data, when the client has not given written permission, then the assistants stay on the mock provider (GRS R-09).',
        ],
      },
      {
        key: 'E-5',
        title: 'No personal identifiers sent to an AI service',
        sprint: 1,
        points: 2,
        priority: 'must',
        done: true,
        deliveredBy: 'fix/area1-ai-no-identifiers',
        labels: ['req: M2 GRS by design'],
        story:
          'As the client, we want no identifier or personal value sent to an outside AI service without our written permission, so that using AI never becomes a data transfer we did not agree to.',
        acceptance: [
          'Given a conflict, when the explainer prompt is built, then it holds no identifier, name, email or phone number, and no value above INTERNAL.',
          'Given the mapping assistant, when its prompt is built, then it holds headers and category codes only, never a personal value.',
          'Given the rule, when anyone reads CLAUDE.md or the GRS register, then it is written there.',
        ],
      },
      {
        key: 'E-6',
        title: 'Mapping assistant for TMS exports and agency layouts',
        sprint: 6,
        points: 5,
        priority: 'should',
        story:
          "As an operations executive, I want the mapping assistant to propose how a TMS export maps to HuiTong and how HuiTong's results fill an agency's layout, so that a new export or a changed layout needs a mapping, not a release.",
        acceptance: [
          'Given a TMS export sample, when it is uploaded, then the wizard proposes a mapping to trainees, courses and runs, with a confidence and a rationale for each column, for approval (E-1, E-2).',
          "Given an agency's layout (its headers and a dummy row), when it is uploaded, then the wizard proposes how HuiTong's result fields fill it, for approval.",
          'Given a proposal, when it is approved, then a new mapping version is saved; the AI never writes anything itself.',
          "Given another provider's TMS export, when it is mapped, then the time from upload to approved mapping is recorded (SM-06).",
        ],
      },
    ],
  },
  {
    key: 'C',
    title: 'Assessment capture and verification',
    area: AREA[2],
    labels: ['req: M4 best practices'],
    goal: 'Assessors record each result once, on a tablet, during the assessment, even where there is no signal; each run moves from planned to submitted through a state machine; operations verify every result before it leaves HuiTong and correct one only with a reason.',
    stories: [
      {
        key: 'C-2',
        title: 'Workflow state machine',
        sprint: 8,
        points: 8,
        priority: 'must',
        labels: ['req: M4 best practices'],
        story:
          'As an operations executive, I want each workflow to move through clear stages with retries, so that no run stalls silently. The state machine itself came with #147 (`feat/area2-state-machine`); retries, auditing and publishing remain.',
        acceptance: [
          'Given an invalid transition, when it is requested, then the state machine refuses it.',
          'Given a step that fails, when it is retried with backoff and the last attempt fails too, then it is flagged for a person.',
          'Given a transition, when it happens, then it is audited and published as a domain event.',
          'Given the state machine, when its unit tests run, then line coverage is at least 80%.',
        ],
      },
      {
        key: 'C-9',
        title: 'Record a run on the tablet checklist',
        sprint: 9,
        points: 8,
        priority: 'must',
        story:
          "As an assessor, I want to record each trainee's criteria on a tablet checklist during the assessment, so that I record each result once and never re-type it (HMW-16).",
        acceptance: [
          'Given my run on a tablet, when I open it, then I see its trainees and the checklist of the rule version the run started with (assumption A-75).',
          'Given a trainee with a critical item unmarked, when I try to finish them, then the checklist refuses and shows the item (HMW-17).',
          'Given the checklist, when it is used on a tablet, then every touch target is at least 44 px and every string is in English and 中文.',
          'Given a run that is not mine, when I try to open it, then it is refused.',
        ],
      },
      {
        key: 'C-10',
        title: 'Keep capturing through a dropped connection, and sync afterwards',
        sprint: 10,
        points: 8,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          'As an assessor in a plant with no signal, I want the checklist to keep every record on the tablet and sync when the connection returns, so that a dropped connection never costs a result.',
        acceptance: [
          'Given no connection, when I record results, then they are kept on the tablet, encrypted, and the screen shows they are waiting to sync (assumption A-82, GR-10).',
          'Given the connection returns, when the tablet syncs, then each record reaches HuiTong exactly once, even if the sync is retried (SM-19, GR-06).',
          'Given a record changed in HuiTong while the tablet was offline, when it syncs, then the conflict is shown for a person to settle and nothing is overwritten silently (GRS R-26).',
          'Given a run that has synced, when it is complete, then its data is cleared from the tablet.',
        ],
      },
      {
        key: 'C-11',
        title: "The run's lifecycle from planned to submitted",
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          'As an operations executive, I want each run to move through clear states from planned to submitted, so that I always know where a run stands and no step is skipped.',
        acceptance: [
          'Given a run, when it moves, then it follows planned, in assessment, captured, verified, in the TMS, submitted and closed (assumption A-73), and any other transition is refused.',
          'Given the lifecycle, when it is built, then it is a definition run by the workflow state machine (C-2), whose code it does not change.',
          'Given a correction after verification, when it is saved, then the result goes back to verification, and the move is audited.',
          'Given the lifecycle, when its unit tests run, then every transition and guard is covered, with at least 80% line coverage.',
        ],
      },
      {
        key: 'C-12',
        title: 'Verification queue with the evidence beside each result',
        sprint: 9,
        points: 5,
        priority: 'must',
        story:
          'As an operations executive, I want a queue of captured runs with each result beside its checklist, so that I verify a run in minutes instead of checking paper (HMW-20).',
        acceptance: [
          'Given the queue, when it loads, then each captured run shows its course, assessor, trainees, calculated outcomes and how long it has waited.',
          'Given a run, when I verify it, then each result is marked verified by me, the run moves on, and the decision is audited.',
          'Given a result not yet verified, when anyone tries to send it to the TMS or an agency, then it is refused (assumption A-74).',
          'Given an assessor, when they try to verify a run, then it is refused (GRS section 2.1).',
        ],
      },
      {
        key: 'C-13',
        title: 'Correct a result with a reason, keeping the original',
        sprint: 10,
        points: 3,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          'As an operations executive, I want to correct a result only with a reason, keeping the original, so that every change can be explained to an auditor.',
        acceptance: [
          'Given a result, when I correct it without a reason, then the correction is refused.',
          'Given a correction, when it is saved, then the original value, the new value, the reason, who and when are kept and audited, and the original is never overwritten (GRS R-29).',
          'Given a result already in the TMS or submitted, when it is corrected, then the run is flagged so that the TMS and the agencies receive the correction.',
        ],
      },
      {
        key: 'C-14',
        title: 'SLA reminders and notifications',
        sprint: 11,
        points: 5,
        priority: 'should',
        story:
          "As an operations executive, I want reminders before a run's results are due at an agency, so that no submission misses its deadline.",
        acceptance: [
          "Given an agency's deadline, when a run's results are not submitted by the reminder point, then a reminder and then an escalation are sent, counted from the assessment date (assumption A-77).",
          'Given a captured run waiting for verification, when its SLA passes, then operations are reminded.',
          'Given a reminder that is retried, when it is sent again, then nobody receives it twice.',
          'Given the SLA rules, when they are tested, then fake timers cover each threshold.',
        ],
      },
      {
        key: 'C-15',
        title: 'Verification assistant: flag unusual records for review',
        sprint: 11,
        points: 5,
        priority: 'should',
        labels: ['req: M3 AI-assisted coding', 'req: M2 GRS by design'],
        story:
          'As an operations executive, I want unusual records flagged with a reason, so that I look twice at the few that matter (HMW-21). Proposed to area 2 in ADR 0023, for its owner to accept.',
        acceptance: [
          'Given a captured run, when the assistant reviews it, then unusual records (for example every criterion marked the same, or a run recorded much faster than usual) are flagged with a reason and a confidence, labelled "Requires review".',
          "Given a flag, when operations look at it, then they decide; the assistant never changes a result or a run's state (GR-01).",
          'Given the assistant, when it runs, then it works on features computed inside HuiTong, sends no trainee identifier or result to a third-party AI service, and every model call is recorded by AiUsageTracker.',
        ],
      },
    ],
  },
  {
    key: 'D',
    title: 'Competency, submissions and insights',
    area: AREA[3],
    labels: ['req: M4 best practices'],
    goal: "Each course's rules are versioned configuration that a training manager approves; competency is calculated from them automatically; each agency's submission file is rendered from its template; management and operations see where every run and submission stands.",
    stories: [
      {
        key: 'D-8',
        title: 'Course rules as versioned configuration',
        sprint: 8,
        points: 8,
        priority: 'must',
        labels: ['req: M2 GRS by design'],
        story:
          "As a training manager, I want each course's criteria, critical items and outcome rule held as a version I approve, so that a rule change needs no code change and each run keeps the version it started with (HMW-18).",
        acceptance: [
          'Given a course, when its rules are defined, then they hold criteria grouped by competency unit, critical items and an outcome rule (assumption A-70).',
          'Given a new version, when it is saved, then it stays a draft until a training manager approves it, and the approval is audited.',
          'Given a run in progress, when a new version is approved, then the run keeps the version it started with (assumption A-75, GRS R-24).',
          'Given a version in use, when anyone tries to edit it, then the edit is refused; a change makes a new version.',
        ],
      },
      {
        key: 'D-9',
        title: 'Calculate competency automatically from the rules',
        sprint: 8,
        points: 5,
        priority: 'must',
        story:
          "As an assessor, I want each trainee's outcome calculated from the course's rules as I record, so that I never work it out by hand.",
        acceptance: [
          "Given a trainee's recorded criteria, when the outcome is calculated, then it follows the run's rule version (SM-14).",
          'Given a critical item not satisfied, when the outcome is calculated, then it is not competent, whatever the other criteria say.',
          'Given an outcome, when it is shown, then it names the rule version and the criteria that decided it.',
          'Given the calculation, when its unit tests run, then every kind of rule and edge case is covered, with at least 80% line coverage.',
        ],
      },
      {
        key: 'D-10',
        title: "Rule-drafting assistant: draft a course's rules from its assessment plan",
        sprint: 10,
        points: 8,
        priority: 'must',
        labels: ['req: M3 AI-assisted coding', 'req: M2 GRS by design'],
        story:
          "As a training manager, I want the AI to draft a new course's rules from its assessment plan, with a confidence and a rationale for each rule, so that a course is set up in an afternoon while I stay in control (HMW-19).",
        acceptance: [
          'Given an assessment plan, when I upload it, then the assistant proposes criteria, critical items and an outcome rule, each with a confidence and a rationale, labelled "Requires approval", and "Mock AI" with the mock provider.',
          'Given the draft, when I edit and approve it, then it becomes a new rule version; until then nothing uses it (GR-01, SM-09).',
          'Given the prompt, when it is built, then it carries the assessment plan only, never trainee data, and the call goes through the LlmGateway and is recorded by AiUsageTracker.',
          'Given E2E #2, when the next run of the course starts, then it uses the approved rules with no code change.',
        ],
      },
      {
        key: 'D-11',
        title: 'Render agency submission files from templates',
        sprint: 9,
        points: 8,
        priority: 'must',
        story:
          "As an operations executive, I want each agency's file rendered from its template with the verified results and checked before delivery, so that I never build a file by hand and the agency accepts it the first time (HMW-22).",
        acceptance: [
          "Given verified results and an agency's template, when the file is rendered, then it follows the agency's column order, codes and date format (assumption A-66).",
          "Given the file, when it is rendered, then it holds only the fields the agency's allowlist shares (B-9), and the internal trainee ID until the client decides how national ID numbers are added (assumption A-69).",
          "Given a file that breaks the agency's known rules, when it is rendered, then each problem is listed for operations before delivery.",
          "Given the renderers, when they are tested, then a golden-file test checks each agency's output.",
        ],
      },
      {
        key: 'D-12',
        title: 'Dashboards for operations and management',
        sprint: 11,
        points: 5,
        priority: 'should',
        story:
          'As a manager, I want to see runs, verification, the TMS writes and the submissions by course and agency, so that I see where every run stands and catch a rejection before its deadline (HMW-23).',
        acceptance: [
          'Given the dashboards, when they load, then they show runs by state, submissions by agency and status, and those near their deadline.',
          "Given the MANAGEMENT role, when it opens a dashboard, then it is read-only and shows aggregates, never one trainee's personal data.",
          'Given each figure, when it is shown, then it says when it was computed and from which records.',
        ],
      },
      {
        key: 'D-13',
        title: 'Insights: effort saved, first-time acceptance and rework',
        sprint: 11,
        points: 3,
        priority: 'should',
        story:
          "As management, we want the effort HuiTong removes and the share of submissions accepted the first time measured from HuiTong's own records, so that the benefit is measured, not claimed.",
        acceptance: [
          'Given the insights panel, when it loads, then it shows SM-12, SM-17 and SM-18, labelled as lab estimates on synthetic data.',
          'Given a measure with too little data, when it is shown, then it says so instead of showing a number.',
        ],
      },
    ],
  },
  {
    key: 'F',
    title: 'Governance and compliance',
    area: AREA[4],
    labels: ['req: M2 GRS by design'],
    goal: "Access, audit, classification, each agency's allowlist and retention are visible and administered, so that ASPRI-IPI is ready for an agency's check and trainees' data is handled under the PDPA.",
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
          "Given the six roles, when the matrix is shown, then each role's permissions and limits match GRS section 2.1.",
          'Given separation of duties, when a system administrator tries to approve a rule, verify a result or submit, then it is refused.',
        ],
      },
      {
        key: 'F-2',
        title: 'Audit-log viewer',
        sprint: 9,
        points: 5,
        priority: 'must',
        story:
          'As an auditor, I want to search the audit trail by record, person and action, so that I can trace any result from capture to submission.',
        acceptance: [
          "Given a result's audit trail, when it opens, then every event is listed: captured, calculated, verified, corrected, written to the TMS and submitted.",
          'Given the audit chain, when it is checked, then any altered event is detected.',
          'Given the AUDITOR role, when it opens the viewer, then nothing in it can be changed.',
        ],
      },
      {
        key: 'F-3',
        title: 'Data classification register',
        sprint: 9,
        points: 3,
        priority: 'should',
        story:
          'As a data protection officer, I want every field classified with its reason, so that masking and submissions follow a published register.',
        acceptance: [
          'Given the register, when it loads, then every trainee and result field shows its classification, the reason and who may see it.',
        ],
      },
      {
        key: 'F-5',
        title: 'Retention settings and purge',
        sprint: 11,
        points: 3,
        priority: 'should',
        story:
          'As a data protection officer, I want retention periods per data type with a scheduled purge, so that we keep data no longer than needed.',
        acceptance: [
          'Given a retention period, when data passes it, then the purge job removes or anonymises it and records what it did.',
          'Given assessment records, when their period is set, then it covers the time in which an agency may check them (assumption A-80).',
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
      {
        key: 'F-7',
        title: "Administer each agency's field allowlist",
        sprint: 10,
        points: 5,
        priority: 'must',
        story:
          "As ASPRI-IPI's data protection officer, I want to record, for each agency, the fields it may receive and why, so that every submission follows an approved list (assumption A-81).",
        acceptance: [
          'Given an agency, when I add or change an allowlist entry, then its version goes up, the change is audited with who made it, and enforcement follows at once (B-9).',
          'Given an entry, when it is recorded, then it names the agency, the fields, the purpose and who approved it.',
          'Given a field with no ACTIVE entry, when a submission is built, then the field is withheld.',
        ],
      },
      {
        key: 'F-8',
        title: 'Audit readiness: the evidence for a run in one place',
        sprint: 11,
        points: 5,
        priority: 'should',
        story:
          "As an auditor, I want one view of a run's evidence (the checklist, the rule version, the outcomes, who assessed, who verified, the corrections and the submissions), so that an agency's check takes minutes (HMW-24).",
        acceptance: [
          'Given a run, when an auditor opens its evidence, then the checklist, the rule version, each outcome, who assessed and who verified it, every correction with its reason and every submission with its acknowledgement are shown, each linked to its audit events.',
          'Given the evidence, when it is exported, then the export is audited and holds no field the auditor may not see.',
        ],
      },
      {
        key: 'F-9',
        title: "PDPA: find a trainee's data for an access request",
        sprint: 11,
        points: 3,
        priority: 'could',
        story:
          "As ASPRI-IPI's data protection officer, I want to find everything HuiTong holds about a trainee, so that an access or correction request under the PDPA is answered quickly.",
        acceptance: [
          'Given a TMS trainee ID, when I search, then every record HuiTong holds about the trainee is listed, with the agencies it was sent to.',
          'Given the search, when it runs, then it is audited.',
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
          'As the product team, we want to see how people use each screen, with their consent, so that we improve what matters.',
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
          "As the team, we want each area's owner and backup owner recorded and CODEOWNERS filled in, so that every pull request asks the right reviewer.",
        acceptance: [
          'Given the owners (Richie, Azri, Iok Teck and Angelyn for areas 1 to 4), when the backups are agreed, then docs/team/module-ownership.md names the owner and the backup owner of each area.',
          'Given CODEOWNERS, when a pull request touches an area, then its owner is asked to review.',
        ],
      },
      {
        key: 'T-2',
        title: 'Briefing call with ASPRI-IPI (week of 2 Nov)',
        sprint: 3,
        points: 3,
        priority: 'must',
        type: 'type: task',
        labels: ['status: needs client input'],
        story:
          'As the team, we want our open questions answered by ASPRI-IPI, so that our assumptions become facts.',
        acceptance: [
          'Given the three items to request in docs/client/questions-for-client.md (the checklists and rules of two or three courses, a TMS export, and one submission example per agency), when the call is arranged, then they are requested first.',
          'Given docs/client/questions-for-client.md, when the call ends, then each question has an answer or a follow-up.',
          "Given the answers, when they are recorded, then the affected assumptions are confirmed or changed, and any sample data stays in the team's data folder, never in git.",
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
          'As the team, we want a clickable prototype of every area, the tablet checklist first, so that the client can react before we build.',
        acceptance: [
          'Given the prototype, when the client walks through it, then each journey from the journey maps can be followed, and the checklist can be tried on a tablet.',
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
          'As the team, we want to hand over what we built with its documentation, so that ASPRI-IPI can take it further.',
        acceptance: [
          'Given the handover, when it is done, then the client has the repository guide, the architecture and the open questions.',
        ],
      },
    ],
  },
];

/**
 * Story keys dropped from the plan, which are never reused. The seed closes
 * any of their issues still open as not planned, with a comment linking the
 * decision; the stories themselves stay in the tag the decision names.
 */
export const RETIRED = {
  decision: 'docs/adr/0023-retarget-ps5-aspri-ipi.md',
  keys: [
    'A-9',
    'A-10',
    'A-11',
    'A-12',
    'B-6',
    'C-1',
    'C-3',
    'C-4',
    'C-5',
    'C-6',
    'C-7',
    'C-8',
    'D-1',
    'D-2',
    'D-3',
    'D-4',
    'D-5',
    'D-6',
    'D-7',
    'F-4',
  ],
};
