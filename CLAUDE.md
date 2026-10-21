# CLAUDE.md

> Project memory for AI coding agents (Claude Code) working in this repository.
> Read it in full before doing anything. It is the source of truth for context, decisions and standards.
> If an instruction conflicts with this file, follow this file and say so.

---

## 1. What this project is

**HuiTong 汇通** (working name: "converge and connect") is an HR and administration **integration and workflow-automation layer** for a financial-services group with a Singapore operation and a China HQ. It connects the systems each office already uses, so approved data flows between them securely instead of people re-keying it through Excel.

- **Module:** IT2134 IT Innovation Project, Diploma in IT, Nanyang Polytechnic, AY2026 Semester 2 (19 Oct 2026 to Feb 2027)
- **Theme:** SCCCI x NYP AI Innovation Challenge
- **Client:** Organisation E (Financial Services), Problem Statement **#17**
- **Team:** 4 Year-2 students: Richie (team lead), Iok Teck, Azri, Angelyn. Ownership areas are at the end of section 4.

### Assessment (this shapes how we build)

| Week | Assessment | Weight |
|---|---|---|
| 5 | Proposal presentation | 25% (group 5, individual 20) |
| 7 | Mock job interview (explain your own part) | 15% individual |
| 13 | Technical review | 25% (group 5, individual 20) |
| 18 | Final presentation | 35% (group 5, individual 30) |

85% of the marks are individual. Every member must own, understand and explain distinct parts of the code. Keep module boundaries clean so ownership is obvious (`docs/team/module-ownership.md`).

### Schedule anchors

W2 (26 Oct) problem allocation, first client meeting in W2 or W3 · W3 project plan · W4 UI prototype · W5 proposal · W8–12 AI-assisted coding · W13 technical review · W14 observability · W15 clickstream analytics · W16 AI token usage tracking · W18 final presentation · W19 client check-in.

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

## 3. The problem (summary; full original text in `docs/problem-statement.md`)

**User:** an HR professional supporting the Singapore operation of a China-headquartered financial-services group.

**Systems today**
- Internal **OA platform** for workflows and approvals: manpower/hiring requests, office rental, out-of-pocket expenses, IT and fixed-asset purchases, payment approvals.
- **Singapore HR software:** locally compliant attendance, leave and payroll.
- **China HQ:** different HR and enterprise systems (ERP, SAP, customised features).
- **Collaboration tools:** Singapore uses Microsoft Office, Teams, OneDrive and CRM. China uses WeChat, DingTalk and Chinese office apps.
- **Excel is the glue:** employee master data lives in Excel because it is the only consolidated view.

**Pain points**
- Different data structures and formats between SG and CN.
- Little system-to-system integration.
- Repeated CSV/Excel export and import.
- Manual consolidation of attendance and leave categories into company reporting templates.
- Approvals happen in OA, but the follow-up work happens elsewhere.
- Access-control and data-protection concerns when employee data crosses entities and countries.

**Root cause:** the systems are digital but isolated, so task-level digitalisation never became end-to-end automation.

**What success looks like:** not one global platform replacing everything, but an intelligent integration and automation layer.
- Approved employee-data changes update other approved systems, or a central employee master.
- Approved manpower requests trigger recruitment and onboarding.
- Attendance and leave consolidate automatically into the required format.
- Management reports draw from multiple authorised sources.
- New subsidiaries plug in through standardised interfaces, with access control, data protection and local compliance.

**Client stance:** open to API integration, workflow automation, RPA, data analytics or AI. Wants a feasible PoC architecture that extends to other functions and subsidiaries. Happy to work closely with the team.

**Unknowns:** the exact systems and vendors, the available APIs, data volumes and real field lists. Until the client meeting, everything external is **mocked**, and every assumption is logged in `docs/assumptions.md`.

---

## 4. Product scope

### Roles (RBAC)

| Role | Access |
|---|---|
| `SYSTEM_ADMIN` | Full system administration |
| `HR_SG` | Singapore HR work |
| `HR_HQ` | China HQ HR work |
| `HIRING_MANAGER` | Hiring and manpower requests |
| `ADMIN_OPS` | Admin preparation tasks |
| `MANAGEMENT` | Reports, read-only |
| `AUDITOR` | Audit log, read-only |

### Capabilities

| # | Capability | Summary |
|---|---|---|
| A | Connector hub | One adapter per external system behind a common `SystemConnector` interface. Mock services cover SG HR, CN HQ (Chinese field names and formats) and OA (webhooks), plus Excel/CSV import. New subsidiaries plug in through configuration and field mappings. |
| B | Canonical employee master | One consolidated employee record, with a source of truth for each field, change history, and conflict detection across systems. |
| C | Workflow automation | Event-driven chain: OA "manpower request approved" → recruitment requisition → hire → onboarding checklist → a **draft** (`PRE_HIRE`) employee record in the master, and in SG HR once HR approves the write → admin preparation (laptop, desk, accounts) → notifications (Teams/DingTalk, mocked). The record becomes active only after the onboarding milestones and the verified SG HR record. Idempotent, retried and audited. |
| D | Attendance and leave consolidation | Pull from SG and CN, then map leave categories (e.g. 年假 ↔ Annual Leave, 病假 ↔ Sick Leave, 调休 ↔ Time-off in lieu). Validate, render into the company reporting template, and export to .xlsx. |
| E | AI assistance (human in the loop) | **Schema-mapping assistant:** proposes mappings from a new system's sample file (including Chinese headers) to the canonical model, with a confidence score and a rationale. HR approves before anything is used. **Discrepancy explainer:** explains conflicts between systems in plain English or 中文. AI never writes to systems of record without human approval. |
| F | Governance and compliance | RBAC, field-level masking, an append-only audit log, data-classification tags, a cross-border transfer register (Singapore PDPA and China PIPL considerations), and retention settings. |
| G | Monitoring and analytics | Observability (structured logs, traces, metrics, health checks), first-party clickstream analytics, and AI token usage and cost tracking, each with an in-app dashboard. |

### Data rules

- **Synthetic data only.** All data is synthetic. Label it "Synthetic demo data" in the UI.
- **No national ID numbers.** Never store NRIC/FIN or PRC resident ID numbers; use internal employee IDs.
- **Masking.** Mask sensitive fields (salary, bank details, date of birth) by role.
- **Identity matching.** Never match people on names, romanisation or name similarity alone. Only the same group employee number (or an audited HR decision) confirms that two records are one person; a look-alike name is a possible match, shown for HR to review and never merged. A work email that another employee already has is refused as a sync error.
- **Draft before active.** An approved OA request creates only a draft (`PRE_HIRE`) employee record. It becomes active only after the agreed onboarding milestones and verified input from the HR system of record.
- **No identifiers to AI.** Employee identifiers (the employee number, names, work email and phone, a manager's number) and sensitive HR data are never sent to a third-party AI service without the client's written permission. Prompts carry headers, value shapes and category codes; values above INTERNAL or that identify a person are withheld.
- **Write-back needs approval.** A write to a system of record needs an explicit, audited human approval after a preview. Against the client's real systems it is out of scope until the client approves it; the mocks may demonstrate it, labelled as mocks.
- **Bilingual UI.** The UI is bilingual (English and 简体中文), switchable at runtime. No hard-coded user-facing strings.

### Ownership areas (each is deep enough to earn an A)

| Area | Owner | Scope |
|---|---|---|
| 1. Integration Core + platform base | Richie | **Platform:** architecture, monorepo, design system and app shell, auth/RBAC baseline, CI/CD, Docker, mock systems. **Integration:** connector framework (Adapter + Factory), canonical employee master with provenance, mapping engine (Strategy transformers), SG ↔ CN sync with conflict resolution, AI schema-mapping assistant, China-side systems (Chinese schemas, DingTalk/WeChat), 3D integration map. |
| 2. Workflow automation | TBD | OA approval webhooks → recruitment → onboarding → employee record → admin preparation. Workflow state machine, event-driven jobs with retries and idempotency, SLA reminders and escalations, notifications (Teams/DingTalk, mocked), workflow board UI. |
| 3. Attendance, leave and reporting | TBD | Attendance and leave ingestion from SG and CN, leave-category mapping rules, validation and exception reports, the company reporting-template engine, .xlsx export, management reports that draw on multiple sources. |
| 4. Governance, security and monitoring | TBD | RBAC and field-masking administration, audit-log viewer, data classification, cross-border transfer register and retention (PDPA/PIPL), OpenTelemetry tracing and metrics, clickstream analytics, AI token usage and cost dashboards, AWS deployment with CloudWatch. |

**Rules**
- **Area 1 is the shared base.** Shared platform code (auth, layout, design system, API client, queues, logging, health, AI usage recording) belongs to area 1.
- **Owners write their own domain logic.** The core domain logic of areas 2–4 is implemented by their owners. Until then, those areas get scaffolding, data models, API contracts, high-fidelity UI wired to typed mock data, test skeletons and an implementation guide (`docs/team/`), but not the owner's core logic, unless that owner asks for it.

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
| `mock-sg-hr` | English field names, ISO dates |
| `mock-cn-hq` | Chinese keys, `YYYY/MM/DD` dates, SAP-like codes |
| `mock-oa` | Approval workflows plus an HMAC-signed webhook emitter |

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
- Domain classes and value objects that hold the invariants (`Employee`, `EmployeeId`, `LeaveType`, `DateRange`, ...).

**Patterns, used only where they earn their place**

| Pattern | Use |
|---|---|
| Adapter | Each external system sits behind `SystemConnector` |
| Factory | Creates connectors from configuration |
| Strategy | Field transformers, leave-category mappers, report renderers |
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

The audience is busy HR professionals doing data-heavy work every day. The product must feel calm, trustworthy and premium: Linear or Stripe-dashboard quality, never a generic template.

### Visual system

- **Design tokens:** live in `styles/tokens.css` (colour, type scale, spacing, radius, shadow, motion). Components use tokens only, with no ad-hoc hex values or magic numbers.
- **Colour:**
  - A warm neutral-grey base, with one primary accent (deep jade/teal) for actions.
  - Semantic colours for success, warning, danger and info; full light and dark themes.
  - No purple-gradient "AI look" and no rainbow gradients. Glass effects only where they add depth (e.g. panels over the 3D scene).
- **Typography:**
  - Geist for Latin text and Noto Sans SC for Chinese, with matched sizing.
  - Tabular numerals in tables and KPIs; at most 7 type sizes; 60–80 characters per line for prose.
- **Layout:** an 8-pt spacing grid and a 12-column responsive grid. Every page follows the same anatomy: page header → filters/actions → content. Desktop-first, fully usable at 1024 px and on tablet.

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
