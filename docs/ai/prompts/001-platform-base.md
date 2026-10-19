# Prompt 001: HuiTong 汇通 platform base

**Problem Statement #17 is treated as allocated to us.**

- Read `CLAUDE.md` in full first. It is the source of truth, including the ownership areas at the end of section 4.
- I am using Kiro only as the IDE. Do **not** use Kiro specs, steering or hooks workflows.

## Goal

Build the foundation the whole team works on this semester, plus my own area (area 1) in full:

1. **Shared base:** complete documentation, the monorepo, tooling, CI, Docker, the backend foundation, the mock systems, synthetic data, and the design system and app shell.
2. **Area 1, Integration Core (mine), fully working end to end:** connector framework, canonical employee master, mapping engine, SG ↔ CN sync with conflict resolution, the AI schema-mapping assistant, and the 3D integration map.
3. **Areas 2–4, strong head starts for my teammates:**
   - data models and API contracts (routes returning typed mock data)
   - high-fidelity UI wired to that mock data, and test skeletons
   - a detailed implementation guide for each area
   - **not** their core domain logic: each owner builds that themselves
4. Architecture and ER diagrams, plus a slide deck.

## How to work

- **Branch:** create `feat/platform-base` from `main`.
- **Commits:** commit at the end of every phase (Conventional Commits). Do not push.
- **Attribution:** no AI attribution of any kind in commits, PR text, code comments or docs (see `CLAUDE.md` section 10).
- **Todo list:** write a todo list covering every phase before you start, and keep it updated.
- **Autonomy:** work autonomously and don't stop to ask me questions.
  - When something is ambiguous, choose the option that best fits `CLAUDE.md`, record it in `docs/assumptions.md` or an ADR, and continue.
  - Stop only if you need credentials, admin rights or software that can't be installed from the terminal. Then tell me the exact manual steps, and carry on with any work that doesn't depend on them.
- **Verification:** after every phase, run lint, typecheck, tests and build, and fix failures before moving on. Never claim something works without running it.
- **Quality bar:** a senior full-stack engineer and a senior product designer reviewing each other's work. Be strict with yourself: refactor anything messy before committing.
- **Logging:** log this session in `docs/ai/ai-usage-log.md`, and save this prompt as `docs/ai/prompts/001-platform-base.md`.

---

## Phase 0: Environment check

1. **Protect secrets first.** Before anything else, make sure `.gitignore` covers `.env`, `.env.local` and `.env.*.local` (keep `.env.example` tracked). The root `.env.local` holds my React Bits licence key; never print its value.
2. **Check the tools:**
   - Node.js ≥ 22
   - pnpm
   - Git
   - Docker and Docker Compose, with the daemon running
   - Blender, via `blender --version`; on Windows, also check `C:\Program Files\Blender Foundation\`
3. **Install what's missing from the terminal where possible:**
   - pnpm: `corepack enable`, or `npm i -g pnpm`
   - Node: `winget install OpenJS.NodeJS.LTS`
   - Docker: `winget install Docker.DockerDesktop`
   - Blender: `winget install BlenderFoundation.Blender`
4. **Hand off manual steps.** If something needs admin rights, a restart, or Docker Desktop's first launch / WSL2 setup, list the exact steps for me and continue with whatever doesn't need it.

---

## Phase 1: Understand and document (`docs/`)

### `docs/problem-statement.md`
- The original statement, verbatim (it is at the bottom of this prompt).
- A structured analysis:
  - stakeholders
  - current-state pain points and root cause
  - constraints
  - in-scope and out-of-scope
  - measurable success metrics, e.g. hours per month saved on consolidation, % of records consistent across systems, lead time from approval to onboarding

### `docs/design-thinking/`
- Personas: SG HR executive, China HQ HR partner, hiring manager.
- Current-state vs future-state journey maps for:
  - a manpower request through to day-1 onboarding
  - the monthly attendance and leave consolidation
- How-Might-We statements.
- Prioritised problem and solution hypotheses.

### `docs/grs/grs-by-design.md`
- **Governance:** roles, approvals, audit.
- **Risk register:** likelihood × impact with mitigations, covering:
  - cross-border transfer (PDPA/PIPL)
  - data breach
  - sync errors
  - AI errors
  - vendor API changes
- **Sustainability:** manual effort removed, less Excel and paper, compute efficiency, scaling to new subsidiaries.

### `docs/client/questions-for-client.md`
Prioritised questions for the first client meeting:
- the actual systems and vendors
- available APIs and exports
- data volumes
- leave category lists
- the reporting template
- approval flows
- data-residency rules
- SSO
- how they will measure success

### `docs/team/module-ownership.md`
- The four ownership areas from `CLAUDE.md`: area 1 is Richie's, areas 2–4 are TBD.
- For each area: the files it owns and its definition of done.

### Also create
- `docs/assumptions.md`
- `docs/requirements-traceability.md` (initial version)
- `docs/adr/0001-record-architecture-decisions.md`, plus one ADR per major stack choice

---

## Phase 2: Monorepo, tooling, CI, Docker, UI kit

### Workspace and tooling
- pnpm workspaces, following the `CLAUDE.md` layout.
- Shared tsconfig, ESLint flat config and Prettier.
- Husky + lint-staged + commitlint.
- **Root scripts:** `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `diagrams:build`, `slides:build`, `format`.

### CI and GitHub templates
- `.github/workflows/ci.yml`:
  - install (with cache)
  - lint and typecheck
  - unit and integration tests, with Postgres and Redis service containers
  - build and docker build
- A PR template, issue templates and a CODEOWNERS placeholder.

### Docker
- Dockerfiles (multi-stage, non-root user, healthcheck) for:
  - the api
  - the web app (nginx, with security headers and an SPA fallback)
  - each mock service
- `docker-compose.yml`:
  - services: postgres, redis, api (runs migrations and the seed on start), web, mock-sg-hr, mock-cn-hq, mock-oa
  - healthchecks on every service, with `depends_on` health conditions

**Acceptance check:** `docker compose up --build` from a clean clone brings up the whole stack with seeded data. Document the ports in the README.

### UI kit setup (this must actually work, so verify every step)

1. **Initialise shadcn/ui in `apps/web`**, following the official shadcn **Vite** installation guide:
   - `@/*` path alias in the tsconfig files and in `vite.config.ts`
   - `"rsc": false`
   - CSS path `src/styles/globals.css`
   - aliases matching the `CLAUDE.md` layout (`@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`)
2. **Add these registries to `apps/web/components.json`:**

   ```json
   "registries": {
     "@reactbits-starter": {
       "url": "https://proxy.collectui.pro/api/r/reactbits/starter/{name}.json",
       "headers": { "Authorization": "Bearer ${REACTBITS_LICENSE_KEY}" }
     },
     "@reactbits-pro": {
       "url": "https://proxy.collectui.pro/api/r/reactbits/pro/{name}.json",
       "headers": { "Authorization": "Bearer ${REACTBITS_LICENSE_KEY}" }
     },
     "@magicui": "https://magicui.design/r/{name}"
   }
   ```

3. **Move the licence key into place.** Copy the `REACTBITS_LICENSE_KEY` line from the root `.env.local` into `apps/web/.env.local`, without printing it. Confirm both files are git-ignored.
4. **Verify each source with a test install:**

   | Source | Test command |
   |---|---|
   | Pro components | `npx shadcn@latest add @reactbits-starter/globe-tw` |
   | Free React Bits | `npx shadcn@latest add @react-bits/SplitText-TS-TW` (built-in namespace; if it doesn't resolve, add the official React Bits registry URL to `registries` and retry) |
   | Magic UI | `npx shadcn@latest add @magicui/animated-shiny-text` |
   | Pro blocks | install one block, e.g. a hero block |

   Delete the test files afterwards unless you will use them. If any source fails, report the exact error, then continue with the sources that work.
5. **Install the React Bits skill:** `npx shadcn@latest add @reactbits-starter/skill`.
   - Make sure its `SKILL.md` ends up at `.claude/skills/reactbits/SKILL.md` (move it there if the CLI puts it elsewhere).
   - Read it in full now. Follow it for every React Bits item you use.
6. **Install the shadcn MCP for Claude Code:** `npx shadcn@latest mcp init --client claude`. It takes effect next session; mention that in the build report.

---

## Phase 3: Backend foundation, mocks and data (shared base)

### NestJS app (per `CLAUDE.md`)
- Typed config and Prisma.
- Global validation and an exception filter.
- Logging with correlation IDs, `/health`, Swagger.

### Auth, access and audit
- Seeded demo users, one for every role.
- RBAC guard and a baseline field-masking interceptor.
- Append-only audit write service.

### Queues and AI plumbing
- BullMQ queue infrastructure shared by every area.
- `LlmGateway` + `AiUsageTracker`, with the mock provider as the default. Wire up the Bedrock provider but keep it optional. Area 1 uses these for the mapping assistant; area 4 builds dashboards on the recorded usage.

### Prisma schema (all areas)
- users and roles
- canonical employees, source records, per-field provenance and change history
- connectors and versioned mapping configs
- sync runs and sync errors
- workflow definitions, instances and tasks
- attendance and leave records, plus category mappings
- reports
- audit events
- clickstream events
- AI usage records
- data classification and the cross-border transfer register

### Mock services
- Each mock service uses a deliberately different schema.
- Realistic synthetic data:
  - about 120 employees across SG and CN, with mixed English and Chinese names
  - departments and positions
  - 3 months of attendance and leave
- The OA mock emits HMAC-signed approval webhooks.

### Frontend platform services
- `ApiClient`.
- An `AnalyticsTracker` class that batches events, skips PII and respects consent.
- A minimal clickstream ingestion endpoint that stores raw events (area 4 builds the analytics on top).

---

## Phase 4: Design system and app shell (shared base)

### Before writing any UI
1. **Read the React Bits skill and the full catalogues:**
   - the free React Bits site: reactbits.dev
   - React Bits Pro: pro.reactbits.dev (components, blocks, Application UI, templates)
   - Magic UI: magicui.design
2. **Write `docs/design/reactbits-usage.md` as a concrete plan:** for every page in the app, which React Bits / Magic UI items it uses and why.
   - Use React Bits extensively wherever it fits.
   - Aim for 20+ distinct items across the app, with Pro blocks on landing/login and Application UI wherever it matches our screens.
   - Every page uses at least one item.
3. **Write `docs/design/design-system.md`:** tokens, type, colour, components, motion, accessibility.

### Build
- Tokens, themes (light/dark), i18n (EN/中文), layouts and shared composites (DataTable, PageHeader, EmptyState, ...).
- **App shell:**
  - sidebar navigation and breadcrumbs
  - a top bar with:
    - a ⌘K command palette
    - EN/中文 language toggle
    - light/dark theme toggle
    - a demo role switcher
    - notifications
- **Landing/login page:** Pro blocks plus a 3D teaser.
- **Overview page:** KPIs, sync health, pending approvals, open conflicts, activity feed.

---

## Phase 5: Area 1, Integration Core (Richie), fully working end to end

### Sync
- Connectors for mock-sg-hr and mock-cn-hq (Adapter + Factory).
- A sync job (Template Method) on BullMQ, with retries and idempotency keys.

### Mapping and the master record
- A field-mapping engine with Strategy transformers for date formats, name order, department codes and enums.
- The canonical employee master, with per-field provenance.
- Conflict detection, and a resolution flow: HR picks the source of truth, and the decision is audited.

### AI schema-mapping assistant
- Upload a sample CSV/Excel file from a "new subsidiary system" (including Chinese headers).
- The AI proposes mappings to the canonical model, each with a confidence score and a rationale.
- HR approves or edits the mappings, and only then is a new versioned mapping config saved.
- Every call is recorded by `AiUsageTracker`.

### UI
- **Employees page:**
  - a searchable, filterable data table
  - a record drawer showing the sources side by side, with conflicts highlighted
  - fields masked according to role, and the audit history
  - a "Run sync" action with live progress
- **Connectors page:** status, config, and the AI mapping wizard with an explicit approval step.

### Tests
- **Unit:** transformers, conflict detection, masking, mapping-proposal validation.
- **Integration:** the sync and mapping endpoints.
- **e2e:** a Playwright smoke test.

### Docs
`docs/team/area-1-integration-core.md`: how it works, the design patterns used, and where to extend it after the client meeting.

---

## Phase 6: Head starts for areas 2–4 (scaffold, don't implement the core logic)

### For each area, build
- Prisma models (already in the schema), DTOs and NestJS module structure.
- API contracts: routes returning realistic typed mock data, documented in Swagger.
- High-fidelity UI screens wired to those contracts, with every state, both languages and both themes.
- Unit and integration test skeletons, with the key cases named.
- `docs/team/area-N-<name>.md`, an implementation guide:
  - goal and user stories with acceptance criteria
  - a recommended design (patterns, data flow, sequence)
  - a step-by-step build plan
  - the risks
  - how it plugs into the platform
  - which assessment requirements it covers

### Screens per area

| Area | Screens |
|---|---|
| Area 2: Workflow automation | The manpower request → onboarding pipeline board and timeline; workflow-instance detail; task list. **Leave for the owner:** the state machine, event handlers and SLA logic. |
| Area 3: Attendance, leave and reporting | Consolidation run screen; category-mapping editor; company-template preview; .xlsx export button; management reports. **Leave for the owner:** the consolidation rules engine and report rendering. |
| Area 4: Governance, security and monitoring | Governance (role/permission matrix, data classification, cross-border transfer register, retention); audit-log viewer; Analytics (observability, clickstream funnels and page stats, AI token usage and cost). **Leave for the owner:** OpenTelemetry/metrics/Grafana, the clickstream analytics pipeline, token budgets and alerts, and the AWS deployment. |

Finally, capture Playwright screenshots of every page in both themes into `docs/design/screenshots/`.

---

## Phase 7: 3D Integration Map (area 1)

### Concept: an "integration constellation"
- **The core:** a central HuiTong core in faceted glass/crystal with an emissive inner light.
- **Two regional clusters** orbit the core: Singapore and China HQ.
- **System nodes:** each external system is a node:
  - SG HR
  - CN ERP/SAP
  - OA
  - Teams/OneDrive
  - DingTalk/WeChat
  - legacy Excel, fading out to show it being replaced
- **Data flow:** data packets travel along glowing bezier arcs between the nodes and the core.
- **Status colours:** synced / pending / error, driven by real sync events from the API.

### Asset pipeline
- **If Blender is available:**
  - Write parametric Blender Python scripts in `assets-src/3d/` for the core, node pods and ring/platform, with PBR materials, bevels and clean topology.
  - Run them headless (`blender -b -P <script>.py`) and export GLB.
  - Optimise with gltf-transform (Draco + WebP), keeping the total ≤ 1.5 MB.
- **If Blender is not available:** build the same geometry procedurally in Three.js, and say so in the build report.

### Real-time scene (React Three Fiber)
- **Rendering:**
  - ACES filmic tone mapping
  - environment lighting from a drei studio preset
  - soft shadows
  - bloom, with a subtle depth of field and vignette
- **Motion:** spring-based and natural, never linear tweens. A slow cinematic camera drift that the user can take over by orbiting.
- **Interaction:** hover tooltips; clicking a node navigates to that connector.
- **React Bits overlays:** use them for the panels and labels on top of the scene.

### Performance and accessibility
- Lazy-load the scene as its own chunk.
- Clamp DPR to [1, 2] and use adaptive quality (drei `PerformanceMonitor`).
- Pause rendering when the scene is off-screen or the tab is hidden.
- With `prefers-reduced-motion`, show a static composed frame instead of the animation.
- Provide a fallback image for when WebGL is unavailable.
- Put a keyboard-accessible list of nodes beside the canvas.

**Target:** 60 fps on a mid-range laptop. Report the real result honestly.

---

## Phase 8: Diagrams

- Write the Mermaid sources in `docs/diagrams/*.mmd`.
- Render them to SVG with `@mermaid-js/mermaid-cli` (`pnpm diagrams:build`).
- Embed them in `docs/architecture/README.md`.

### Diagrams
- System context (C4 level 1) and container diagram (C4 level 2).
- Deployment diagram: Docker locally, plus the AWS target.
- Sequence diagrams:
  - a manpower request approved through to onboarding
  - the monthly attendance and leave consolidation
  - an employee sync with conflict resolution
- Data-flow diagram, with trust boundaries and GRS controls marked.
- ER diagram, generated from `schema.prisma` or kept in sync with it.

Also write `docs/architecture/patterns.md`: each design pattern used, why it's used, and where it lives in the code.

---

## Phase 9: Slides

A Marp deck at `docs/slides/huitong.md`, with a custom theme (`docs/slides/theme/huitong.css`) that uses the same tokens and fonts as the app.

### Style
- 12–14 slides, one idea per slide.
- Minimal text and strong visuals: real product screenshots and the rendered diagrams.

### Slide order
1. Title
2. The HR professional's day today
3. Root cause
4. What success looks like
5. The solution: an integration layer, not a replacement
6. Architecture
7. Walkthrough of a key workflow
8. Product screenshots
9. AI features and responsible use
10. GRS by design
11. Monitoring: observability, clickstream, AI tokens
12. Roadmap and open client questions
13. Team and the four ownership areas

### Output
- Speaker notes for every slide.
- `pnpm slides:build` exports PDF, HTML and PPTX to `docs/slides/dist/`.

---

## Phase 10: Hardening and handover

### Checks
- **Security:** an OWASP checklist in `docs/grs/security-checklist.md`, plus a dependency audit.
- **Accessibility:** an axe pass in Playwright.
- **Performance:** a Lighthouse run on the main pages, with the results recorded.
- **Secrets:** grep the whole repo and git history for the licence key and any secrets; the key must appear nowhere except the git-ignored `.env.local` files.
- **Attribution:** confirm that no commit message, doc or code comment contains AI attribution text.

### Handover docs
- **`README.md`:**
  - what the product is, with screenshots
  - quick start (Docker and local)
  - scripts and demo accounts
  - architecture links and the team workflow
- **`CONTRIBUTING.md`:**
  - branching, the PR process and commit format
  - a summary of the code standards
  - a step-by-step guide to adding a new connector
  - how to add React Bits components (each teammate needs the licence key in their own `apps/web/.env.local`)
- **`docs/BUILD_REPORT.md`:**
  - what was built and how it was verified (summaries of real command output)
  - a React Bits usage summary: every installed item and where it's used
  - known gaps and honest limitations
  - next steps for each ownership area

### Final check
From a clean state, run install, lint, typecheck, test, build and `docker compose up --build`. Commit.

---

## Original Problem Statement #17 (verbatim; copy into `docs/problem-statement.md`)

**Project 17: Cross-platform HR and administration data integration and workflow automation for overseas operations**
Organisation: E · Industry: Financial Service

**Customer/audience:** An HR professional supporting an overseas business operation, managing employee information and coordinating HR and admin processes across multiple platforms. An internal OA platform handles workflows and approvals (manpower/hiring requests, office rental, out-of-pocket expenses, IT and fixed-asset purchases, payment approvals). Singapore HR uses locally compliant software for attendance, leave and payroll, while China HQ uses different HR and enterprise systems. Overseas teams use Microsoft Office, Teams and OneDrive; China colleagues use WeChat, DingTalk and Chinese office apps. Excel remains the intermediary for consolidating information between systems.

**Desired outcome:** HR and admin information flows accurately between systems, departments and locations without repeated entering, exporting, reformatting and reconciling. For example, employee data in the Singapore HR system is also needed by HQ; attendance and leave must be consolidated into the company's reporting format; an approved manpower request in OA should trigger recruitment, onboarding, employee-record creation and admin preparation. Information approved at one stage should trigger or update downstream processes without manual intervention.

**Barriers:**
- Different data structures and formats between Singapore and China systems.
- Limited or inconsistent system-to-system integration.
- Repeated exporting and importing of Excel/CSV files.
- Manual consolidation of attendance and leave categories into company-specific reporting templates.
- Employee master data maintained in Excel because it gives management a consolidated view not available from individual systems.
- Approvals processed in OA while subsequent activities happen in other systems.
- Overseas teams use Microsoft Office, Teams, OneDrive and CRM; China colleagues rely on WeChat, DingTalk and Chinese office apps.
- The need for appropriate access control and data protection when employee information is shared across entities and countries.

**Root cause:** Not the absence of digital systems - many processes are already digitalised. The systems operate as separate digital environments, so task-level digitalisation has not produced end-to-end automation. The problem is how existing platforms can securely exchange approved data and trigger workflows while each operation keeps systems suited to local requirements.

**Feelings:** Frustrating to have multiple digital systems yet still rely on Excel and manual work to connect them. Concern about whether data in different locations stays consistent and up to date. HR spends time checking data, chasing approvals and reconciling records instead of workforce planning and employee development.

**Impact:** Duplicated work and a higher chance of inconsistent employee records. Manual transfer consumes HR and admin resources and can delay management reporting. Each new overseas market may add another locally compliant system; without a scalable integration approach, every new operation could create another isolated data environment.

**Future state / success:** Not replacing all systems with one global platform, but an intelligent integration and automation layer that lets local and HQ systems communicate securely. Approved employee data changes update other approved systems or a central employee master dataset; approved manpower requests trigger recruitment or onboarding workflows; attendance and leave consolidate automatically into the required format; management reports draw from multiple authorised sources. A scalable model lets future subsidiaries connect to HQ through standardised data interfaces and workflow automation, with access control, data protection and local compliance. The goal: move from systems connected by people and spreadsheets to systems connected by secure, intelligent workflows.

**Requires company data:** Yes

**Systems for the PoC:** Unsure; in China they use ERP and SAP, including some customised IT features.

**Remarks:** Thanks SCCCI for the programme and sees wider relevance for Chinese enterprises going global, which face similar HQ-to-subsidiary integration challenges. The challenge is the growing number of systems across countries and functions, not a lack of digital tools. Interested in a practical, scalable approach that connects existing systems rather than replacing them, with secure data exchange, synchronisation and consolidation. Open to API integration, workflow automation, RPA, data analytics or AI - the priority is understanding a feasible future solution, not prescribing technology. Would appreciate a PoC architecture extendable to other functions and subsidiaries. Happy to work closely with the team to explain workflows, identify sample processes and give feedback.
