# Module ownership

This file records who owns which part of HuiTong 汇通, what each area provides to the others and needs from them, and when an area counts as done. The ownership areas come from [CLAUDE.md](../../CLAUDE.md) section 4. Paths follow the planned layout in CLAUDE.md section 6. They are confirmed as code lands in Phases 2 to 6, and this file is updated in the same PR.

## Why ownership is explicit

85% of the IT2134 marks are individual: the W5 proposal (20), the W7 mock job interview (15), the W13 technical review (20) and the W18 final presentation (30). At the W7 interview each member explains their own part of the code. Clean module boundaries make each person's work visible in the code, in the Git history and in the demo.

## Areas at a glance

| Area                                   | Owner                          | Capabilities (CLAUDE.md section 4)                                                                                          | Implementation guide                                           |
| -------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Integration Core + platform base    | Richie (team lead)             | A Connector hub, B Canonical employee master, E AI assistance, plus the shared base that F and G build on                   | [area-1-integration-core.md](area-1-integration-core.md)       |
| 2. Workflow automation                 | TBD: Iok Teck, Azri or Angelyn | C Workflow automation                                                                                                       | `docs/team/area-2-workflow-automation.md` (Phase 6)            |
| 3. Attendance, leave and reporting     | TBD: Iok Teck, Azri or Angelyn | D Attendance and leave consolidation, and management reports                                                                | `docs/team/area-3-attendance-leave-reporting.md` (Phase 6)     |
| 4. Governance, security and monitoring | TBD: Iok Teck, Azri or Angelyn | F Governance and compliance (administration), G Monitoring and analytics (telemetry and dashboards), and the AWS deployment | `docs/team/area-4-governance-security-monitoring.md` (Phase 6) |

Areas 2 to 4 are shared out among Iok Teck, Azri and Angelyn. Once the team agrees who takes which, the names go into this table and into `.github/CODEOWNERS`. The working assumption is that this happens by the W3 project plan ([A-44](../assumptions.md)).

## Ground rules

1. **Area 1 owns the shared platform.** Auth, the app shell and layout, the design system, the API client, queues, logging, health checks and AI usage recording belong to area 1, whichever feature needs them.
2. **Owners write their own domain logic.** For areas 2 to 4 the platform build gives a head start only:
   - Prisma models, contract schemas and the NestJS module structure
   - API contracts: routes that return realistic typed mock data, documented in Swagger
   - high-fidelity UI wired to those contracts, with every state, EN and 中文, and light and dark themes
   - unit and integration test skeletons with the key cases named
   - an implementation guide in `docs/team/`

   The core logic in the table below is left to the owner. It is written by someone else only if that owner asks.

3. **Depend on contracts, not internals.** Areas talk to each other through the interfaces listed in their sections: domain events, services a NestJS module exports, REST endpoints, and shared schemas in `@huitong/shared`. Never import another area's repositories or query its tables directly.
4. **Contracts change additively.** A breaking change to a shared schema, an event payload or an endpoint needs approval from every owner who consumes it, plus an ADR in `docs/adr/`.

| Area | Head start from the platform build                                                                                                                                            | Left for the owner                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | Pipeline board and timeline, workflow-instance detail, task list; workflow models; contracts                                                                                  | The workflow state machine, event handlers and SLA logic                                                                                          |
| 3    | Consolidation run screen, category-mapping editor, company-template preview, .xlsx export button, management reports; models; contracts                                       | The consolidation rules engine and report rendering                                                                                               |
| 4    | Governance tabs (access matrix, classification, cross-border register, retention), audit-log viewer, analytics tabs (observability, clickstream, AI usage); models; contracts | OpenTelemetry tracing and metrics (Grafana is the owner's call), the clickstream analytics pipeline, token budgets and alerts, the AWS deployment |

---

## Area 1: Integration Core + platform base (Richie)

**Scope.**

- **Platform:** architecture, monorepo, design system and app shell, auth and the RBAC baseline, CI/CD, Docker, mock systems.
- **Integration:** connector framework (Adapter + Factory), canonical employee master with provenance, mapping engine (Strategy transformers), SG ↔ CN sync with conflict resolution, the AI schema-mapping assistant, China-side systems (Chinese schemas, DingTalk/WeChat) and the 3D integration map.
- **Also area 1:** the AI discrepancy explainer, because it explains the employee-master conflicts that area 1 detects ([A-45](../assumptions.md)).

**Owns**

| Layer                | Paths                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web platform         | `apps/web/src/app/`, `apps/web/src/components/` (`ui/`, `reactbits/`, `common/`), `apps/web/src/lib/`, `apps/web/src/hooks/`, `apps/web/src/i18n/` (setup and the key-parity test), `apps/web/src/styles/`, `apps/web/src/assets/`, `apps/web/components.json` |
| Web features         | `apps/web/src/features/{overview,employees,connectors,integration-map,auth,settings}/`                                                                                                                                                                         |
| i18n namespaces      | `apps/web/src/i18n/locales/{en,zh-CN}/{common,auth,overview,employees,connectors,integrationMap,settings}.json`                                                                                                                                                |
| API platform         | `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/common/`, `apps/api/src/config/`, `apps/api/src/infrastructure/` (Prisma, queues, LLM providers and `AiUsageTracker`, audit writer, domain events and SSE, telemetry bootstrap)            |
| API modules          | `apps/api/src/modules/{auth,users,employees,connectors,mapping,ai,health}/`, plus the minimal clickstream ingest endpoint inside `apps/api/src/modules/analytics/`                                                                                             |
| Data                 | `apps/api/prisma/` (`schema.prisma` is shared, see the protocol below), `apps/api/prisma/seed/`                                                                                                                                                                |
| Mock systems         | `services/mock-sg-hr/`, `services/mock-cn-hq/`, `services/mock-oa/`                                                                                                                                                                                            |
| Packages             | `packages/shared/` (package setup and shared primitives), `packages/eslint-config/`, `packages/tsconfig/`                                                                                                                                                      |
| Infra and repository | `infra/docker/`, `docker-compose.yml`, `.env.example`, `.github/`, root workspace configuration, `assets-src/3d/`                                                                                                                                              |
| Docs                 | `docs/team/area-1-integration-core.md`, `docs/architecture/`, `docs/diagrams/`, `docs/design/`                                                                                                                                                                 |

**Exposes to other areas**

| Interface                                                                                                                                                                                      | Kind             | Used by                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| Session and current user (role, entity scope); RBAC guard and role decorator                                                                                                                   | API platform     | 2, 3, 4                                                             |
| Field-masking interceptor driven by the classification map; masked values carry a reason                                                                                                       | API platform     | 2, 3, 4                                                             |
| Append-only audit writer (every write calls it)                                                                                                                                                | API platform     | 2, 3, 4                                                             |
| BullMQ queue infrastructure: retries, backoff, `Idempotency-Key` handling                                                                                                                      | API platform     | 2, 3                                                                |
| `LlmGateway` and `AiUsageTracker` (every AI call is recorded)                                                                                                                                  | API platform     | Any area that adds AI; 4 reads the records                          |
| Domain event bus and SSE stream at `/api/v1/events`                                                                                                                                            | API platform     | 2, 3, 4                                                             |
| Error envelope, typed errors, `UPPER_SNAKE` error codes and the pagination schema in `@huitong/shared`                                                                                         | Contract         | All                                                                 |
| `SystemConnector` and `ConnectorFactory`; connectors `sg-hr`, `cn-hq`, `oa`, `excel-master`, `teams`, `dingtalk`                                                                               | Connector hub    | 2 (notifications, SG HR write), 3 (attendance and leave extraction) |
| Domain event `oa.approval.completed`, published after the HMAC check and once the `InboundWebhookEvent` is stored                                                                              | Event            | 2                                                                   |
| Employee master: masked read and search, lookup by `employeeNo` (fallback `workEmail`), a create-from-hire use case                                                                            | Service and REST | 2, 3                                                                |
| Field transformers for dates, name order, department codes, enums and phone numbers                                                                                                            | Strategy classes | 3                                                                   |
| Web: `ApiClient`, `AnalyticsTracker`, the app shell (router, sidebar, breadcrumbs, command palette, role switcher), design tokens, shared composites (`DataTable`, `PageHeader`, `EmptyState`) | Web platform     | 2, 3, 4                                                             |
| Raw `ClickstreamEvent` rows stored by `POST /api/v1/analytics/events`                                                                                                                          | Data             | 4                                                                   |

**Consumes**

| From          | What                                              | Why                                                                                                                              |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Area 4        | Cross-border transfer register and masking policy | SG01 RESTRICTED fields reach HR_HQ only with an approved register entry. A seeded baseline policy applies until area 4 delivers. |
| Areas 2 and 3 | Summary endpoints                                 | The Overview page shows pending approvals, open tasks and consolidation status                                                   |

**W7 mock interview: be ready to explain**

- Why each external system sits behind an Adapter and connectors are built by a Factory from configuration, and how a new subsidiary (the `MY01` demo) plugs in through configuration and field mappings.
- How the Strategy transformers convert CN HQ data: `YYYY/MM/DD` dates, family-name-first 姓名, SAP-like org-unit codes such as `50001030` to canonical department codes, and enum codes such as 雇佣状态 "3" to `ACTIVE`.
- The Template Method sync job (extract → map → validate → load → audit), its retries and idempotency keys, and what happens when a sync fails halfway.
- Per-field source of truth and provenance, how a conflict is detected, and how HR's resolution is audited.
- How masking combines classification level and entity scope, and how the "why is this hidden" reason reaches the UI.
- The AI schema-mapping assistant: the provider abstraction and deterministic mock, confidence and rationale, why approval is enforced on the server rather than only in the UI, versioned mapping configs, and what `AiUsageTracker` records.
- Auth and webhook security: argon2id, cookie flags, refresh rotation with reuse detection, CSRF double-submit, and HMAC with a replay window.
- The platform decisions and their ADRs: hub-and-spoke integration (0002), pnpm workspaces (0003), TypeScript 6 and ESM (0004), NestJS 12 (0006), Prisma 7.10 (0007) and shared zod contracts (0009). Also the CI pipeline, the Docker images, and the 3D map's performance budget and accessibility fallbacks.

**Area 1 is done when** (in addition to the shared definition of done below)

- The SG HR and CN HQ connectors sync end to end against the mocks, and OA webhooks are verified, stored and published as `oa.approval.completed`.
- Running the same sync twice changes nothing the second time (integration test).
- Unit tests cover transformers, conflict detection, masking and mapping-proposal validation with at least 80% line coverage.
- The AI mapping wizard saves a new versioned mapping only after HR approval, and every call produces an `AiUsageRecord` (tested).
- The Overview, Employees, Connectors and Integration map pages handle every state, and the Playwright smoke test passes with axe checks.
- `docs/team/area-1-integration-core.md` and `docs/architecture/patterns.md` are current, and the traceability rows for capabilities A, B and E are Done.

---

## Area 2: Workflow automation (owner TBD)

**Scope.** OA approval webhooks → recruitment → onboarding → employee record → admin preparation, built from these parts:

- the workflow state machine
- event-driven jobs with retries and idempotency
- SLA reminders and escalations
- notifications (Teams/DingTalk, mocked)
- the workflow board UI

Area 2 starts where the connector hub stops. Area 1 verifies, stores and publishes the webhook; area 2 subscribes to `oa.approval.completed` and owns everything that follows.

**Owns**

| Layer     | Paths                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/workflows/` (controllers, services, repositories, state machine, event handlers, queue processors)                     |
| Web       | `apps/web/src/features/workflows/` (routes `/workflows`, `/workflows/:instanceId`, `/workflows/tasks`)                                       |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/workflows.json`                                                                                        |
| Data      | Workflow definition, instance and task models in `apps/api/prisma/schema.prisma` (shared file)                                               |
| Contracts | The workflows schemas in `packages/shared/`                                                                                                  |
| Tests     | Unit specs in `apps/api/src/modules/workflows/`, API integration test `apps/api/test/workflows.e2e-spec.ts`, a Playwright flow for the board |
| Docs      | `docs/team/area-2-workflow-automation.md`                                                                                                    |

**Consumes**

| From                   | Interface                                                                | Use                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Area 1 connector hub   | `oa.approval.completed` (`MANPOWER_REQUEST`; other approval types later) | Start a workflow instance; ignore duplicate OA event ids                                                          |
| Area 1 employee master | Create-from-hire use case                                                | Create the `PRE_HIRE` record in the master and in SG HR through the `sg-hr` connector ([A-21](../assumptions.md)) |
| Area 1 connectors      | `teams` and `dingtalk` notification adapters                             | Send reminders, escalations and hand-offs                                                                         |
| Platform               | Queues, audit writer, RBAC guard, SSE                                    | Jobs with retries, an audit event for every transition, live board updates                                        |

**Exposes**

| Interface                                                                                                                     | Used by                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `/api/v1/workflows/*`: instances, timelines and tasks (paginated)                                                             | Workflow pages; Overview (area 1)            |
| Workflow lifecycle events (instance started or completed, task overdue) on the event bus; names are fixed in the area 2 guide | Overview activity feed, notifications        |
| Admin preparation tasks (laptop, desk, accounts) for `ADMIN_OPS`                                                              | `/workflows/tasks`                           |
| Lead time from OA approval to onboarding checklist                                                                            | Success metrics, management reports (area 3) |

**W7 mock interview: be ready to explain**

- The workflow states and transitions, which transitions are illegal, and how the state machine rejects them.
- Why the chain is event-driven (Observer and domain events, [ADR 0008](../adr/0008-jobs-events-realtime.md)) instead of the webhook handler calling each step in turn.
- Idempotency: what happens when OA delivers the same approval twice, or a job retries after a partial success.
- Retries and backoff in BullMQ, and what HR sees after the last attempt fails.
- SLA timers, reminders and escalations: how they are scheduled, cancelled and tested with fake timers.
- How each step is audited and how the approval steps appear in the UI.
- How the board stays live over SSE and handles loading, empty, error, partial and permission-denied states.

**Area 2 is done when**

- An approved `MANPOWER_REQUEST` from `mock-oa` creates exactly one workflow instance, even when the event is delivered twice, and the chain runs through to a `PRE_HIRE` employee record and the admin preparation tasks.
- Unit tests cover every transition, guard and SLA calculation with at least 80% line coverage. Integration tests cover the happy path, 401 and 403, and a duplicate event.
- Failed steps retry with backoff and show as a visible failed state after the last attempt.
- Every transition writes an audit event, and reminders and escalations go out through the notification adapters.
- The board, instance detail and task list run on the real API with every state, in EN and 中文.
- The area 2 guide and the traceability rows for capability C are current.

---

## Area 3: Attendance, leave and reporting (owner TBD)

**Scope.** This area covers:

- attendance and leave ingestion from SG and CN
- leave-category mapping rules
- validation and exception reports
- the company reporting-template engine and .xlsx export
- management reports that draw on multiple sources

**Owns**

| Layer     | Paths                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/attendance-leave/`, `apps/api/src/modules/reports/`                                                                                                     |
| Web       | `apps/web/src/features/attendance-leave/` (routes `/attendance-leave`, `/attendance-leave/mappings`, `/attendance-leave/template`, and the `/reports` page)                   |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/attendanceLeave.json`, `apps/web/src/i18n/locales/{en,zh-CN}/reports.json`                                                              |
| Data      | Attendance and leave records, leave-category mappings and report models in the shared Prisma schema                                                                           |
| Contracts | The attendance-leave and reports schemas in `packages/shared/`                                                                                                                |
| Tests     | Unit specs in both modules; `apps/api/test/attendance-leave.e2e-spec.ts` and `apps/api/test/reports.e2e-spec.ts`; the "run a consolidation" step of the Playwright smoke test |
| Docs      | `docs/team/area-3-attendance-leave-reporting.md`                                                                                                                              |

**Consumes**

| From                   | Interface                                                            | Use                                                                                        |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Area 1 connector hub   | `SystemConnector` adapters for `sg-hr` and `cn-hq`                   | Extract attendance and leave; no area-specific HTTP clients                                |
| Area 1 employee master | Lookup by `employeeNo` (fallback `workEmail`), entity and department | Attach every record to a canonical employee                                                |
| Area 1 mapping engine  | Field transformers for dates and enums                               | Reuse instead of re-implementing source formats                                            |
| Platform               | Queues, audit writer, masking, RBAC guard                            | Consolidation runs as a job; mapping-rule approvals are audited; `MANAGEMENT` is read-only |

**Exposes**

| Interface                                                                                         | Used by                                              |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/api/v1/attendance-leave/*`: runs, category mappings, exceptions, template preview, .xlsx export | Attendance and leave pages                           |
| `/api/v1/reports/*`: management reports, read-only for `MANAGEMENT`                               | Reports page                                         |
| Consolidation status and exception counts                                                         | Overview (area 1)                                    |
| Effort per consolidation run                                                                      | Success metric "HR hours per month on consolidation" |

**W7 mock interview: be ready to explain**

- The canonical leave categories and the mapping rules, for example 年假 → `ANNUAL`, 调休 → `TIME_OFF_IN_LIEU`, 事假 and No-pay Leave → `UNPAID`, and why 探亲假 (home leave) is reported as an exception for the template.
- Why the leave-category mappers and report renderers use the Strategy pattern, and how a new subsidiary's categories are added as configuration.
- The validation rules: unknown categories, overlapping leave, leave on non-working days, employees missing from the master, totals that do not reconcile.
- How working days are counted per entity, using the Singapore and mainland China public-holiday calendars, including China's weekend make-up working days ([A-36](../assumptions.md)).
- The template engine and .xlsx export: library choice, values versus formulas, and how the output is tested.
- How management reports combine authorised sources without exposing masked fields.

**Area 3 is done when**

- One month of SG and CN data consolidates into the company template, and every source category in [A-08](../assumptions.md) is either mapped or listed as an exception.
- Unit tests cover the mappers, validation rules and renderers with at least 80% line coverage, and a golden-file test checks the .xlsx output.
- Integration tests cover the happy path, 401 and 403, and an invalid mapping rule.
- Mapping-rule changes need approval and are audited, and HR sees a preview before any export.
- The "run a consolidation" step of the Playwright smoke test runs against the real implementation.
- The area 3 guide and the traceability rows for capability D are current.

---

## Area 4: Governance, security and monitoring (owner TBD)

**Scope.**

- **Governance:** RBAC and field-masking administration, the audit-log viewer, data classification, the cross-border transfer register and retention settings (PDPA/PIPL).
- **Monitoring:** OpenTelemetry tracing and metrics, clickstream analytics, AI token usage and cost dashboards.
- **Deployment:** AWS, with CloudWatch.

**Owns**

| Layer     | Paths                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/governance/`, `apps/api/src/modules/audit/` (viewer and query), `apps/api/src/modules/analytics/` (except the ingest endpoint)                                                                                            |
| Web       | `apps/web/src/features/governance/` (`/governance` tabs: access matrix, classification, cross-border register, retention; `/governance/audit`) and `apps/web/src/features/analytics/` (`/analytics` tabs: observability, clickstream, AI usage) |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/governance.json`, `apps/web/src/i18n/locales/{en,zh-CN}/analytics.json`                                                                                                                                   |
| Infra     | `infra/aws/` (ECS Fargate, RDS PostgreSQL, ElastiCache, S3 + CloudFront, CloudWatch, Secrets Manager)                                                                                                                                           |
| Telemetry | Instrumentation, exporters and metric definitions. The bootstrap in `apps/api/src/infrastructure/telemetry/` stays with area 1 and changes through the shared-files protocol.                                                                   |
| Data      | Classification, cross-border transfer register and retention models. Read access to `AuditEvent`, `AiUsageRecord` and `ClickstreamEvent`.                                                                                                       |
| Docs      | `docs/team/area-4-governance-security-monitoring.md`, `docs/grs/security-checklist.md` (Phase 10, with the team), the `infra/aws` README                                                                                                        |

**Consumes**

| From                                           | Interface                                     | Use                                                          |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Platform audit writer                          | `AuditEvent` rows                             | Audit-log viewer (read-only for `AUDITOR`)                   |
| `AiUsageTracker`                               | `AiUsageRecord` rows                          | AI token and cost dashboard, budgets and alerts              |
| Clickstream ingest (area 1)                    | `ClickstreamEvent` rows                       | Funnels and page statistics                                  |
| Area 1 auth                                    | Users, roles, RBAC guard, masking interceptor | Administer the role/permission matrix and the masking policy |
| Telemetry bootstrap; logs with correlation ids | Hook and log stream                           | Traces, metrics and dashboards                               |

**Exposes**

| Interface                                                                                                      | Used by                                        |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `/api/v1/governance/*`: access matrix, classification, transfer register, retention                            | Governance pages                               |
| Transfer-register check: is an approved entry in place for this data class, source entity and recipient        | Masking interceptor (area 1)                   |
| `/api/v1/audit/*`: filtered, paginated, read-only                                                              | Audit-log viewer; audit-trail links on records |
| `/api/v1/analytics/*` (dashboards)                                                                             | Analytics pages                                |
| `/metrics` (prom-client); OpenTelemetry trace ids, which replace request ids as the error envelope's `traceId` | Operations; every error state in the UI        |
| The AWS deployment, CloudWatch dashboards and alarms                                                           | The team, for W14 to W18                       |

**W7 mock interview: be ready to explain**

- The seven-role RBAC model, how field masking combines classification and entity scope ([ADR 0010](../adr/0010-auth-sessions-rbac-masking.md)), and how a policy change takes effect and is audited.
- How the audit log is kept append-only, and what an auditor can and cannot do.
- The classification levels (PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED) and why salary and bank fields are RESTRICTED.
- What a cross-border transfer register entry records, and how it reflects the PDPA Transfer Limitation Obligation (s.26) and PIPL Articles 38 and 39. These are design considerations; the client's compliance and legal team confirms them ([A-25](../assumptions.md), [A-26](../assumptions.md)).
- How retention settings work and what happens to data that expires.
- OpenTelemetry traces across API → queue → connector, the metrics on `/metrics`, and how the `traceId` in an error envelope leads to the trace.
- Clickstream privacy: route patterns instead of raw URLs, no input values, the consent toggle and Global Privacy Control.
- The observability baseline you extend ([ADR 0016](../adr/0016-observability-baseline.md)); AI token and cost tracking, budgets and alerts; the AWS architecture and the CloudWatch setup ([ADR 0014](../adr/0014-deployment-docker-aws.md)).

**Area 4 is done when**

- The governance tabs and the audit-log viewer run on the real API. Changes to roles, masking, classification, transfer entries and retention are restricted to authorised roles and audited.
- Unit tests cover the policy logic (masking policy, transfer-register checks, retention rules) with at least 80% line coverage. Each module has integration tests for the happy path and for 401 and 403. One test shows that audit events cannot be changed or deleted through the API.
- Traces span API requests, queue jobs and connector calls. `/metrics` exposes request, queue and sync metrics, and the observability tab shows them.
- Clickstream funnels and page statistics come from real events. The AI usage dashboard shows cost per feature and per model, with budgets and alerts.
- The stack runs on AWS with CloudWatch logs, metrics and alarms, documented in `infra/aws`.
- The security checklist is complete, and the area 4 guide and the traceability rows for capabilities F and G are current.

---

## Shared definition of done (every PR, every area)

The Definition of Ready and the Definition of Done are written once, in [docs/agile/definition-of-ready-and-done.md](../agile/definition-of-ready-and-done.md). They apply to every area and every pull request, and the pull request template repeats the Done checklist.

## Shared-files protocol

Some files are changed by every area. A conflict in one of them blocks everyone, so they follow stricter rules.

| File                                                                                                                                   | Why it is shared                            | Rule                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml`                                                                           | One dependency graph for the whole monorepo | Add packages with `pnpm add --filter <workspace> <package>@<exact-version>`. Never hand-edit the lockfile: on a conflict, take `main`'s lockfile and run `pnpm install` again. Say in the PR why the dependency is needed. |
| `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`                                                                      | One database for every area                 | Change only your area's models. Make one migration per PR, created on top of the latest `main`. Never edit a merged migration. Add an `@@index` for each new query path.                                                   |
| `apps/api/src/app.module.ts`                                                                                                           | Registers every NestJS module               | Add or remove only your own module's import.                                                                                                                                                                               |
| Web router and sidebar navigation (`apps/web/src/app/`)                                                                                | Every route and navigation item             | Add only your own lazy routes and navigation entries; labels come from your i18n namespace.                                                                                                                                |
| `docker-compose.yml`, `infra/docker/`, `.env.example`                                                                                  | The whole local stack                       | New services or variables need the platform owner's review. Document every variable in `.env.example` with a safe default, and keep the healthchecks.                                                                      |
| Shared primitives in `packages/shared/` (roles, error codes, pagination, classification, event names)                                  | Contracts between web and API               | Additive changes only; renames and removals need every consumer's approval. Your area's own schemas in the package are yours to change.                                                                                    |
| `apps/web/src/styles/tokens.css` and the `common` i18n namespace                                                                       | The design system and shared strings        | Propose new tokens or keys. Never add ad-hoc values.                                                                                                                                                                       |
| `.github/` (CI, templates, CODEOWNERS)                                                                                                 | Gates every PR                              | The platform owner changes these; others propose.                                                                                                                                                                          |
| [requirements-traceability.md](../requirements-traceability.md), [assumptions.md](../assumptions.md), `docs/design/reactbits-usage.md` | Team registers                              | Update your own rows in your PR; never renumber ids.                                                                                                                                                                       |

**How to change a shared file**

1. Put the change in its own small PR, separate from feature logic (for example `chore/workflows-schema-sla`). It then gets reviewed and merged quickly.
2. Rebase on `main` first. For a schema change, regenerate the migration if another migration has landed since.
3. Request a review from the platform owner (Richie). Once CODEOWNERS is filled in, GitHub requests it automatically.
4. After the merge, tell the team in the team channel so everyone rebases.
5. A breaking contract change also needs an ADR and the approval of each owner who consumes the contract.

**CODEOWNERS.** Phase 2 adds `.github/CODEOWNERS` as a placeholder. Once the areas are assigned, it maps the shared files above to the platform owner and each area's folders to that area's owner. The GitHub usernames are added then too. Branch protection on `main` then requires a code-owner review.

**Implementation guides.** Each area gets a guide in `docs/team/`: area 1 in Phase 5 and areas 2 to 4 in Phase 6. Each guide covers:

- the goal, with user stories and acceptance criteria
- the recommended design: patterns, data flow and sequence
- a step-by-step build plan
- the risks
- how the area plugs into the platform
- the assessment requirements it covers

The file names for areas 3 and 4 above are the planned names. If they change, this file is updated with them.
