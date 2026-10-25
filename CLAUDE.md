# CLAUDE.md

> Project memory for AI coding agents (Claude Code) working in this repository.
> Read it in full before doing anything. It is the source of truth for context, decisions and standards.
> If an instruction conflicts with this file, follow this file and say so.

---

## 1. What this project is

**HuiTong 汇通** (working name: "converge and connect") is an **assessment capture and integration layer** for ASPRI-IPI, the training arm of the Association of Process Industry in Singapore. Assessors record a practical assessment once, on a tablet; HuiTong calculates each trainee's competency from the course's rules and carries the verified results into the Training Management System (TMS) and on to the government portals, through an agency's API where one exists and as an agency-specific submission file where it does not.

- **Module:** IT2134 IT Innovation Project, Diploma in IT, Nanyang Polytechnic, AY2026 Semester 2 (19 Oct 2026 to Feb 2027)
- **Theme:** SCCCI x NYP AI Innovation Challenge
- **Client:** ASPRI-IPI, Problem Statement **#5**, the team's first choice after statement #7 was withdrawn on 23 Oct 2026. The final allocation is announced on 26 Oct; until then, write that #5 is the first choice, not that it was allocated (`docs/adr/0023-retarget-ps5-aspri-ipi.md`). The tag `archive/ps7-lesso-solar` keeps the repository as it stood under #7.
- **Team:** 4 Year-2 students: Richie (team lead, area 1), Azri (area 2), Iok Teck (area 3) and Angelyn (area 4). Ownership areas are at the end of section 4.

### Assessment (this shapes how we build)

| Week | Assessment | Weight |
|---|---|---|
| 5 | Proposal presentation | 25% (group 5, individual 20) |
| 7 | Mock job interview (explain your own part) | 15% individual |
| 13 | Technical review | 25% (group 5, individual 20) |
| 18 | Final presentation | 35% (group 5, individual 30) |

85% of the marks are individual. Every member must own, understand and explain distinct parts of the code. Keep module boundaries clean so ownership is obvious (`docs/team/module-ownership.md`).

### Schedule anchors

W2 (26 Oct) problem allocation · W3 (week of 2 Nov) briefing call with ASPRI-IPI · W3 project plan · W4 UI prototype · W5 proposal · W8–12 AI-assisted coding · W13 technical review · W14 observability · W15 clickstream analytics · W16 AI token usage tracking · W18 final presentation · W19 client check-in.

---

## 2. Module requirements (non-negotiable; every feature maps to at least one)

1. **Design thinking:** a problem grounded in real user and stakeholder needs, with clear solution objectives.
2. **GRS by design:** governance, risk and sustainability built into the solution design and UI prototype.
3. **AI-assisted coding:** build with AI tools responsibly and ethically, knowing their capabilities and limits.
4. **Best practices:** application security, performance optimisation and testing.
5. **Team Git workflow:** branches and pull requests to integrate and manage everyone's code.
6. **Deploy and monitor:** cloud deployment with observability, clickstream analytics and AI token usage tracking.

Keep `docs/requirements-traceability.md` current: requirement → feature/control → code location → evidence (test, screenshot, metric).

The module's AI coding tool is AWS Kiro (used here as the IDE). Students "own every line they submit".


---

## 3. The problem (summary; the analysis is in `docs/problem-statement.md`)

**Users:** the assessors who observe practical assessments in real training environments, and the operations staff who verify the results and submit them to the agencies.

**The client today**
- About 40 assessment runs a week, more than 30 trainers and assessors, and 2,000 to 2,400 trainees assessed a month. About 80% of the courses are WSQ (half of those MOM-regulated) and 20% are ITE courses.
- Assessors tick paper checklists, work out each trainee's competency by hand from the detailed criteria, and re-type the results into the **Training Management System (TMS)**.
- Operations staff check the TMS entries against the paper, then submit the results to the government portals: **MOM (AMS)**, **SSG/WSDA** and **ITE (STEP)**. Some portals have no API.

**Where the effort goes:** consolidation and TMS entry take about 60% of the post-assessment effort, portal submissions 20%, verification 10%, rework 5% and filing 5%. At about one hour per run, that is roughly 2,000 assessor hours a year before verification and submission.

**Root cause:** the assessment is captured on paper, and the rules that turn it into a result exist only as documents, so every later step re-keys and re-checks it.

**What success looks like** (from the brief):
- Assessors record results on tablet-based digital checklists during the assessment.
- Competency is calculated automatically from each course's assessment rules.
- Results flow straight into the TMS, which becomes the single source of truth.
- Submissions go through an agency's API where one exists, and otherwise as agency-specific submission files.

**Priorities:** capture, the competency rules and the TMS output first, because that is where most of the time is lost. Generated submission files are the safer route where a portal has no API.

**Unknowns:** the TMS product, its API and its export formats; each agency's channel (an API or a file) and its format; how checklists and course rules are written today; the verification steps; which trainee identifier each agency requires; the tablets and the connectivity in the training environments; the volumes per agency. Until the client's samples arrive through the team's data folder, everything external is **mocked**, and every assumption is logged in `docs/assumptions.md`. The brief and any client sample data are never committed.

---

## 4. Product scope

### Roles (RBAC)

| Role | Access |
|---|---|
| `SYSTEM_ADMIN` | Full system administration |
| `ASSESSOR` | Records the assessments of their own runs on a tablet; sees those runs' trainees and checklists |
| `OPERATIONS` | Verifies results, corrects them with a reason, sends them to the TMS and the agencies, and tracks the submissions |
| `TRAINING_MANAGER` | Owns the courses and their assessment rules; approves rules, AI drafts included |
| `MANAGEMENT` | Dashboards and reports, read-only |
| `AUDITOR` | Audit trail, read-only |

These replace the earlier statement's HR roles additively: the new roles come first, and the HR roles leave once no area uses them (ADR 0023).

### Capabilities

| # | Capability | Summary |
|---|---|---|
| A | Connector hub | One adapter per external system behind a common `SystemConnector` interface. The TMS (`mock-tms`: courses, runs, trainees and results through an API and CSV exports); each agency through its API where it has one (a mock with asynchronous acknowledgement), and otherwise through a generated file delivered to its portal (a mock that validates the MOM and ITE files and returns a report), with every submission's status tracked; and Excel/CSV import through the mapping engine. Another training provider joins through a tenant configuration: its name, connector set, field mappings, course rules and theme tokens. |
| B | Master data | Trainees, assessors, courses and course runs, with a source of truth for each field and its change history. |
| C | Assessment capture and verification | The tablet checklist, which keeps working through a dropped connection and syncs afterwards; the run's lifecycle from planned to submitted; operations' verification queue; corrections with a reason; SLA reminders. Idempotent, retried and audited. |
| D | Competency, submissions and insights | Course-specific rules (criteria, critical items, outcomes) as versioned configuration; automatic competency calculation; agency submission files rendered from templates; dashboards and insights for management and operations. |
| E | AI assistance (human in the loop) | **Rule-drafting assistant:** drafts a course's rules from its assessment plan, with a confidence and a rationale, for a training manager to approve (the mapping assistant's pattern). **Mapping assistant:** proposes mappings for TMS exports and agency layouts. **Verification assistant:** flags unusual records for operations to review. AI never changes a result. |
| F | Governance and compliance | RBAC, field-level masking, a tamper-evident audit trail of every result, correction and submission, data-classification tags, PDPA for trainee data, retention settings, and a per-agency field allowlist that denies by default (the cross-entity allowlist mechanism, reused). |
| G | Monitoring and analytics | Observability (structured logs, traces, metrics, health checks), first-party clickstream analytics, and AI token usage and cost tracking, each with an in-app dashboard. |

### Data rules

- **Synthetic data only.** All data is synthetic. Label it "Synthetic demo data" in the UI.
- **No national ID numbers.** Never store NRIC/FIN numbers; use internal trainee IDs. Real submissions need trainees' ID numbers, so how an agency file gets one is an assumption and a client question; until it is answered, generated files carry the internal trainee ID.
- **Masking.** Mask sensitive fields (contact details, date of birth, and results outside a user's own runs) by role.
- **Identity matching.** Match trainees on the TMS trainee ID, never on names alone. A look-alike name is a possible match, shown for review and never merged.
- **Verified before it leaves.** A result reaches the TMS and the agencies only after operations verify it. A correction needs a reason, keeps the original value, and is audited. AI never changes a result.
- **Rules are versioned.** A run is assessed against the version of the course rules it started with. A new version needs a training manager's approval and no code change.
- **No identifiers to AI.** Trainee identifiers, results and other personal data are never sent to a third-party AI service without the client's written permission. The rule-drafting assistant reads a course's assessment plan, not trainee data. Prompts carry headers, value shapes and category codes; values above INTERNAL or that identify a person are withheld.
- **Default deny per agency.** An agency receives only the fields that an ACTIVE entry in its allowlist shares; everything else is withheld, in the API and in files. A change to an entry raises its version and is audited.
- **Write-back needs approval.** A write to the TMS or a submission to an agency needs an explicit, audited approval by operations after a preview. Against the client's real systems it is out of scope until the client approves it; the mocks may demonstrate it, labelled as mocks.
- **Bilingual UI.** The UI is bilingual (English and 简体中文), switchable at runtime, to be confirmed at the briefing call. No hard-coded user-facing strings.

### Ownership areas (each is deep enough to earn an A)

| Area | Owner | Scope |
|---|---|---|
| 1. Integration core and platform | Richie | **Platform:** architecture, monorepo, design system and app shell, auth/RBAC baseline, CI/CD, Docker, mock systems, the tenant configuration (another training provider joins by configuration). **Integration:** connector framework (Adapter + Factory) with connectors for the TMS, the agency APIs and the delivery of agency files with their submission status; master data (trainees, assessors, courses, runs) with provenance; mapping engine (Strategy transformers) for TMS exports and agency templates, with its AI assistant; the per-agency allowlist's enforcement; 3D integration map. |
| 2. Assessment capture and verification | Azri | The tablet checklist with offline sync; the run's state machine, with Azri's workflow state machine at its core; the verification queue, with the verification assistant (proposed in ADR 0023); corrections with a reason; SLA reminders and notifications; the capture and verification screens. |
| 3. Competency, submissions and insights | Iok Teck | Course rules (criteria, critical items, outcomes); competency calculation; the rule-drafting assistant (through the `LlmGateway`); agency submission files rendered from templates; dashboards and insights for management and operations. |
| 4. Governance, security and monitoring | Angelyn | RBAC and field-masking administration, the audit-log viewer and audit readiness, data classification, PDPA and retention, the per-agency allowlist's administration; OpenTelemetry tracing and metrics, clickstream analytics, AI token usage and cost dashboards, AWS deployment with CloudWatch. |

**Rules**
- **Area 1 is the shared base.** Shared platform code (auth, layout, design system, API client, queues, logging, health, AI usage recording) belongs to area 1.
- **Owners write their own domain logic.** Azri, Iok Teck and Angelyn write the core logic of areas 2 to 4. A change in their folders is a pull request the owner reviews (`docs/team/module-ownership.md`). Area 1 keeps each area's implementation guide in `docs/team/` current and makes additive changes to the shared contracts, each in a pull request the owner reviews; it reworks an area's head start (scaffolding, data models, the area's API contracts, typed sample data, screens and test skeletons) only when the owner asks.

---

## 5. Architecture and stack (decided)

Record any deviation as an ADR in `docs/adr/NNNN-title.md`. Use the latest stable versions and pin exact versions.

**Monorepo**
- pnpm workspaces, Node.js LTS (22 or newer).
- TypeScript in `strict` mode everywhere.

**Web (`apps/web`)**
- React 19 + Vite, Tailwind CSS v4.
- UI components: shadcn/ui (Radix) for accessible primitives, React Bits for motion and visual components, Lucide icons.
- Routing and state: React Router, TanStack Query for server state, Zustand for the minimal client state.
- Forms and i18n: react-i18next, React Hook Form + zod.
- Charts and motion: Recharts, Motion.
- 3D: React Three Fiber + drei + @react-three/postprocessing.

**API (`apps/api`)**
- NestJS (modular, class-based dependency injection).
- Data and jobs: Prisma + PostgreSQL, BullMQ + Redis for jobs and retries.
- Validation and docs: class-validator DTOs or zod pipes, Swagger at `/api/docs`.
- Observability: nestjs-pino logging, OpenTelemetry tracing, prom-client at `/metrics`, @nestjs/terminus health checks.

**Mock external systems (`services/mock-*`)**

Small Express + TypeScript apps with deliberately different schemas:

| Service | Schema |
|---|---|
| `mock-sg-hr` | INFO-TECH-like: English field names and ISO dates in its API; UTF-8 CSV exports of employees, leave and payroll with `DD/MM/YYYY` dates (`MM/YYYY` pay periods) |
| `mock-cn-hq` | Chinese keys, `YYYY/MM/DD` dates, SAP-like codes |
| `mock-oa` | Approval workflows plus an HMAC-signed webhook emitter |

These three are the previous statement's mocks, still running while the code is retargeted. Prompt 005 step 4 replaces them with `mock-tms`, an agency API mock and an agency portal mock (section 4, capability A; ADR 0023).

**Shared (`packages/shared`)**
- Canonical types, zod schemas, enums and i18n keys shared by web and api.

**AI**
- `LlmGateway` with three providers:
  - `mock`: the default; deterministic, needs no API key.
  - `bedrock`: AWS Bedrock.
  - `openai`: optional.
- Every call goes through `AiUsageTracker`, which records tokens in/out, model, latency, cost estimate, feature, user and outcome.

**Infra**
- Docker (multi-stage builds, non-root user, health checks) + docker-compose.
- GitHub Actions CI.
- AWS target, documented in `infra/aws`:
  - Compute: ECS Fargate or App Runner.
  - Data: RDS PostgreSQL, ElastiCache.
  - Web hosting: S3 + CloudFront.
  - Monitoring and secrets: CloudWatch, Secrets Manager.

---

## 6. Repository layout

```
.
├── apps/
│   ├── web/                      # components.json + .env.local (git-ignored) live here
│   │   └── src/
│   │       ├── app/              # providers, router, layouts, app shell
│   │       ├── features/         # one folder per domain: pages, components, hooks, api
│   │       │   ├── overview/  employees/  workflows/  attendance-leave/
│   │       │   └── connectors/  integration-map/  governance/  analytics/  auth/  settings/
│   │       ├── components/
│   │       │   ├── ui/           # shadcn primitives (generated)
│   │       │   ├── reactbits/    # React Bits components actually used, one per file
│   │       │   └── common/       # shared composites (DataTable, PageHeader, EmptyState, ...)
│   │       ├── lib/              # ApiClient, AnalyticsTracker, formatters (class-based services)
│   │       ├── hooks/            # shared hooks (shadcn alias @/hooks)
│   │       ├── i18n/             # en.json, zh-CN.json, setup
│   │       ├── styles/           # tokens.css, globals.css
│   │       └── assets/
│   └── api/
│       ├── prisma/               # schema.prisma, migrations, seed/
│       └── src/
│           ├── main.ts  app.module.ts
│           ├── common/           # guards, interceptors, filters, decorators, pipes
│           ├── config/
│           ├── infrastructure/   # prisma, queues, telemetry, llm providers
│           └── modules/
│               ├── auth/  users/  employees/  connectors/  mapping/  workflows/
│               └── attendance-leave/  reports/  governance/  audit/  analytics/  ai/  health/
├── services/
│   ├── mock-sg-hr/  mock-cn-hq/  mock-oa/
├── packages/
│   ├── shared/  eslint-config/  tsconfig/
├── assets-src/3d/                # Blender Python scripts + README (source of .glb assets)
├── docs/
│   ├── problem-statement.md  assumptions.md  requirements-traceability.md  BUILD_REPORT.md
│   ├── design-thinking/          # personas, journey maps, HMW, success metrics
│   ├── grs/  architecture/  diagrams/   # diagrams: Mermaid .mmd + rendered .svg
│   ├── adr/  api/  design/  client/  team/
│   ├── ai/                       # prompts/, ai-usage-log.md
│   └── slides/                   # Marp deck, theme, dist/
├── infra/
│   ├── docker/  aws/
├── .github/                      # workflows/, pull_request_template.md, ISSUE_TEMPLATE/
├── docker-compose.yml  .env.example  README.md  CONTRIBUTING.md  CLAUDE.md
```

**File organisation rules**
- One concept per file; feature folders own their code.
- No "misc", "helpers2" or catch-all `utils` dumping grounds.
- Barrel `index.ts` files only at package boundaries.
- Naming: files in kebab-case; React components and classes in PascalCase; hooks in `useCamelCase`.

---

## 7. Engineering standards

### OOP (backend, mock services, non-UI frontend services)

**Layers**
- NestJS modules and controllers (thin).
- Services (use cases).
- Repositories (the only place Prisma is called).
- Domain classes and value objects that hold the invariants (`Trainee`, `TraineeId`, `RuleVersion`, `DateRange`, ...).

**Patterns, used only where they earn their place**

| Pattern | Use |
|---|---|
| Adapter | Each external system sits behind `SystemConnector` |
| Factory | Creates connectors from configuration |
| Strategy | Field transformers, outcome rules, agency file renderers |
| Template Method | Base sync job: extract → map → validate → load → audit |
| Observer / domain events | Workflow triggers |
| Repository | Data access |

Document each pattern in `docs/architecture/patterns.md`, with file references.

**Principles:** SOLID, depend on interfaces, constructor injection. No static singletons except framework-managed providers.

### Frontend

- Function components and hooks only; no class components.
- Classes are for non-UI services only (`ApiClient`, `AnalyticsTracker`, `FeatureFlags`).
- Keep components to roughly 200 lines or fewer; split them otherwise.

### General

- **Types and validation:** no `any`. Validate all external input at the boundaries (zod or DTOs).
- **Errors:** typed errors, a global exception filter, and one error envelope: `{ error: { code, message, details, traceId } }`.
- **Clean code:** no `console.log` in committed code (use the logger), no dead code, no commented-out code.
- **Comments and docs:** comments explain *why*, not what. Public classes and functions get concise TSDoc.
- **Config:** use a typed config module and read secrets only from env. `.env.example` documents every variable.

### Security

**Transport and headers**
- helmet with a strict CSP.
- CORS allow-list.
- Rate limiting.

**Authentication and access**
- argon2 password hashing.
- JWT in httpOnly secure cookies, with refresh-token rotation.
- RBAC guard plus a field-level masking interceptor.

**Data handling**
- Input validation; parameterised queries only (Prisma).
- Audit every write.
- HMAC verification for webhooks.

**Process**
- Dependency audit in CI.
- Follow the OWASP Top 10 and the OWASP API Security Top 10.

### Performance

- Route-level code splitting; 3D and charts are lazy-loaded.
- Pagination on every list endpoint; a database index for every query path; React Query caching.
- **Budgets:**
  - Initial JS ≤ 250 KB gzip, excluding the lazy 3D chunk.
  - LCP < 2.5 s.
  - Lighthouse ≥ 90 for Performance, Accessibility and Best Practices on the main pages.

### Testing

- **Unit tests** for domain logic (mapping, transformers, the workflow state machine, masking), with ≥ 80% line coverage on those modules.
- **API integration tests** (Supertest) for each module: the happy path plus an auth failure.
- **Playwright e2e smoke test:** log in → overview → employee master → approve a mapping → run a consolidation. Add axe accessibility checks.
- All tests run in CI.

---

## 8. UI and design rules (strict)

The audience is assessors recording practical assessments on tablets in real training environments, and operations staff doing data-heavy work every day. The product must feel calm, trustworthy and premium: Linear or Stripe-dashboard quality, never a generic template.

### Visual system

- **Design tokens:** live in `styles/tokens.css` (colour, type scale, spacing, radius, shadow, motion). Components use tokens only, with no ad-hoc hex values or magic numbers.
- **Colour:**
  - A warm neutral-grey base, with one primary accent (deep jade/teal) for actions.
  - Semantic colours for success, warning, danger and info; full light and dark themes.
  - No purple-gradient "AI look" and no rainbow gradients. Glass effects only where they add depth (e.g. panels over the 3D scene).
- **Typography:**
  - Geist for Latin text and Noto Sans SC for Chinese, with matched sizing.
  - Tabular numerals in tables and KPIs; at most 7 type sizes; 60–80 characters per line for prose.
- **Layout:** an 8-pt spacing grid and a 12-column responsive grid. Every page follows the same anatomy: page header → filters/actions → content. Desktop-first for operations and management, fully usable at 1024 px; the assessor's checklist is tablet-first, with touch targets of at least 44 px, and keeps working offline.

### Behaviour

- **Design principles to apply (and be able to cite):**
  - Visual hierarchy and Gestalt (proximity, similarity, common region).
  - Nielsen's 10 heuristics.
  - Fitts's law for primary actions, Hick's law (progressive disclosure), Jakob's law (familiar patterns).
  - Recognition over recall.
  - Error prevention: confirm destructive or irreversible actions, and show a preview before any sync writes data.
- **States:** every data view handles loading (skeletons), empty (with a next action), error (with retry and traceId), partial data, success feedback (toasts) and permission-denied.
- **Accessibility:** WCAG 2.2 AA:
  - Text contrast ≥ 4.5:1 and visible focus rings.
  - Full keyboard navigation, aria labels and semantic HTML.
  - `prefers-reduced-motion` respected everywhere.
- **Motion:** purposeful only. Use 150–250 ms ease-out for UI and springs for spatial movement. Never animate tables or forms while the user is working in them.
- **GRS visible in the UI:**
  - Data-classification badges, and masked fields with a "why is this hidden" tooltip.
  - Audit-trail links on records, and approval steps shown explicitly.
  - AI suggestions labelled with their confidence and "Requires approval".

### Banned

- Lorem ipsum, and "John Doe" placeholder data.
- Emoji used as icons, and mixed icon sets.
- Centred body text.
- More than one primary button per view.

---

## 9. Component registries (React Bits and friends)

All UI components are installed with the shadcn CLI, run from `apps/web` (where `components.json` lives).

| Namespace | What it provides | Access |
|---|---|---|
| shadcn/ui (default) | Accessible base primitives (Button, Dialog, Table, ...) | Free |
| `@react-bits` | React Bits free components from reactbits.dev, e.g. `SplitText-TS-TW` | Free, built-in namespace |
| `@reactbits-starter` | React Bits Pro components (`-tw` / `-css` variants) and the React Bits skill | Licence key |
| `@reactbits-pro` | React Bits Pro blocks (`category-number`, e.g. `pricing-4`), Application UI (e.g. `ai-chat-1-sorbet`), Agent Kit | Licence key |
| `@magicui` | Magic UI free components | Free |

### Rules

- **Licence key:**
  - `REACTBITS_LICENSE_KEY` lives only in `apps/web/.env.local`, which is git-ignored.
  - Never print it, commit it, or copy it into docs, prompts or logs.
- **Pro code is paid:** this rule asked for a private repository while it contains React Bits Pro code. On 20 Oct 2026 the team lead decided to keep the repository public and accepted the licence risk ([ADR 0017](docs/adr/0017-ui-component-registries.md#amendment-20-oct-2026-a-public-repository)); the licence-key rules above are unchanged.
- **Variants:** always install the TypeScript + Tailwind variant (`-TS-TW` for free React Bits, `-tw` for Pro components).
- **The React Bits skill is authoritative:** `.claude/skills/reactbits/SKILL.md` covers usage, props and animation parameters. Read it before using any React Bits item.
- **Use React Bits extensively wherever it fits.** Installed but unused is a waste.
  - Pro blocks for landing/login and marketing-style sections.
  - Application UI where it matches our screens.
  - Components for text animation, backgrounds, KPI counters, cards, loaders, page transitions, empty states and overlays on the 3D scene.
  - Every page uses at least one React Bits item.
  - Dense work surfaces (tables, forms, filters) get only subtle items (loaders, counters, hover/focus effects).
- **Make it native:** adapt every item to the design tokens (colour, radius, motion timing) so it looks built-in, not pasted in. Keep one component per file, with a header comment stating its origin.
- **Document it:**
  - Keep `docs/design/reactbits-usage.md` current: item → where it's used → why → its reduced-motion behaviour.
  - Delete anything that was installed but isn't used.

---

## 10. Git, AI use and safety

- **Branches and commits:**
  - Never commit to `main`; branch per task: `feat/<area>-<desc>`, `fix/...`, `docs/...`, `chore/...`.
  - Conventional Commits; small, reviewable commits.
- **Pushing:** do not push or open PRs unless the user explicitly asks.
- **Never commit:** secrets or licence keys, or real personal data. The repository is public, so client documents and NYP material marked Official (Closed) are never committed.
- **No AI attribution anywhere visible:** no "Co-Authored-By" trailers, no "Generated with ..." lines, no AI emojis or session links in commits, PR titles or descriptions, code comments or docs. `.claude/settings.json` turns off Claude Code's automatic attribution. AI use is documented in one place only: `docs/ai/ai-usage-log.md`, which the module assesses.
- **AI usage log:** log significant AI-assisted work in `docs/ai/ai-usage-log.md` (date, tool, task, prompt file, what was accepted or changed, human reviewer). Store substantial prompts in `docs/ai/prompts/`.
- **Honesty:** run the commands and report the real results. Never claim something works without verifying it. If something cannot be done, say so and propose the closest alternative.

---

## 11. Definition of done (every task)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass, and `docker compose up --build` still works.
- **UI changes:** every state is covered, EN and 中文 strings are added, keyboard and reduced-motion behaviour are checked, and screenshots go in the PR description.
- **Docs updated:** the traceability matrix, an ADR if a decision changed, and the AI usage log if the work was AI-assisted.
