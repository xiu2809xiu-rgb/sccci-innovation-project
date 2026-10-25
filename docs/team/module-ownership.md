# Module ownership

This file records who owns which part of HuiTong 汇通, what each area provides to the others and needs from them, and when an area counts as done. The ownership areas come from [CLAUDE.md](../../CLAUDE.md) section 4, for Problem Statement #5, ASPRI-IPI ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)). Paths follow the layout in CLAUDE.md section 6. Where a folder is still named for an earlier statement, this file says so and names the story or step that renames it.

## Why ownership is explicit

85% of the IT2134 marks are individual: the W5 proposal (20), the W7 mock job interview (15), the W13 technical review (20) and the W18 final presentation (30). At the W7 interview each member explains their own part of the code. Clean module boundaries make each person's work visible in the code, in the Git history and in the demo.

## Areas at a glance

| Area                                    | Owner              | Capabilities (CLAUDE.md section 4)                                                                                                  | Implementation guide                                                                 |
| --------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1. Integration core and platform        | Richie (team lead) | A Connector hub, B Master data, E AI assistance (the gateway and the mapping assistant), plus the shared base that F and G build on | [area-1-integration-core.md](area-1-integration-core.md)                             |
| 2. Assessment capture and verification  | Azri               | C Assessment capture and verification, with the verification assistant (E), proposed to the area in ADR 0023                        | [area-2-workflow-automation.md](area-2-workflow-automation.md)                       |
| 3. Competency, submissions and insights | Iok Teck           | D Competency, submissions and insights, with the rule-drafting assistant (E)                                                        | [area-3-attendance-leave-reporting.md](area-3-attendance-leave-reporting.md)         |
| 4. Governance, security and monitoring  | Angelyn            | F Governance and compliance (administration), G Monitoring and analytics (telemetry and dashboards), and the AWS deployment         | [area-4-governance-security-monitoring.md](area-4-governance-security-monitoring.md) |

The owners were set with the retarget ([prompt 005](../ai/prompts/005-retarget-ps5-aspri-ipi.md)), and CLAUDE.md names them. The guides of areas 2 to 4 still describe the earlier statement: step 6 of prompt 005 rewrites each one for #5 in a pull request its owner reviews, and renames its file where the old name would mislead.

## Backup owners

Each area has a named backup who can explain its design, run its demo steps and review its pull requests when the owner is away. Backups are agreed with the owners ([T-1](../agile/backlog.md#t-1-agree-area-owners-and-fill-codeowners)), so they stay TBD until then. Adopted from Azri's integrated plan.

| Area                                    | Owner    | Backup owner |
| --------------------------------------- | -------- | ------------ |
| 1. Integration core and platform        | Richie   | TBD          |
| 2. Assessment capture and verification  | Azri     | TBD          |
| 3. Competency, submissions and insights | Iok Teck | TBD          |
| 4. Governance, security and monitoring  | Angelyn  | TBD          |

- **Cross-review.** Every member reviews at least one teammate's critical pull request, normally in the area they back up. A pull request is critical when it changes a domain rule, a contract between areas, access control or masking, or a migration.
- **Shared deployment knowledge.** Area 4's backup takes part in one deployment rehearsal ([P-8](../agile/backlog.md#p-8-hardening-and-handover)), so the AWS setup is never known by one person only.
- **Presenting.** If an owner cannot present at W18, their backup presents that area's steps of the [hero journey](../agile/hero-journey.md#presenter-plan-w5-proposal-and-w18-final).

## Ground rules

1. **Area 1 owns the shared platform.** Auth, the app shell and layout, the design system, the API client, queues, logging, health checks and AI usage recording belong to area 1, whichever feature needs them.
2. **Owners write their own domain logic.** For areas 2 to 4 the platform build gave a head start for an earlier statement:
   - Prisma models, contract schemas and the NestJS module structure
   - API contracts: routes that return realistic typed mock data, documented in Swagger
   - high-fidelity UI wired to those contracts, with every state, EN and 中文, and light and dark themes
   - unit and integration test skeletons with the key cases named
   - an implementation guide in `docs/team/`

   Step 6 of prompt 005 asks each owner, through the team lead, whether they want the head start reworked for #5 or will rework it themselves ([P-7](../agile/backlog.md#p-7-head-starts-for-areas-2-to-4)). A rework comes in one pull request per area, reviewed by its owner, and never touches the owner's own code. The core logic in the table below is left to the owner, and written by someone else only if that owner asks.

3. **Depend on contracts, not internals.** Areas talk to each other through the interfaces listed in their sections: domain events, services a NestJS module exports, REST endpoints, and shared schemas in `@huitong/shared`. Never import another area's repositories or query its tables directly.
4. **Contracts change additively.** A breaking change to a shared schema, an event payload or an endpoint needs approval from every owner who consumes it, plus an ADR in `docs/adr/`. The #5 roles follow this rule: they are added beside the HR roles, which leave only once no area uses them ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)).

| Area | Head start today (built for an earlier statement)                                                                                                                                          | Left for the owner (#5)                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | Workflow board, timeline, instance detail and task list; workflow models and contracts. Beside them sits Azri's own definition-driven state machine (#147), which carries over as it is    | The run's lifecycle as a definition on the state machine, the tablet checklist and its offline sync, the verification queue, corrections, SLA rules and reminders, and the verification assistant if the owner accepts it         |
| 3    | Consolidation screen, category-rule editor, template preview, .xlsx export and management reports; their models and contracts                                                              | Course rules and their versions, competency calculation, the rule-drafting assistant, agency submission files rendered from templates, dashboards and insights                                                                    |
| 4    | Governance tabs (access matrix, classification, transfer register, retention), the audit-log viewer, the analytics tabs (observability, clickstream, AI usage); their models and contracts | Each agency's allowlist (the transfer register's mechanism, reused), audit readiness, retention for assessment records, OpenTelemetry tracing and metrics, the clickstream pipeline, token budgets and alerts, the AWS deployment |

---

## Area 1: Integration core and platform (Richie)

**Scope.**

- **Platform:** architecture, monorepo, design system and app shell, auth and the RBAC baseline, CI/CD, Docker, mock systems and the tenant configuration ([A-20](../agile/backlog.md#a-20-tenant-configuration-another-training-provider-joins-by-configuration)).
- **Integration:** the connector framework (Adapter + Factory) with connectors for the TMS, the agency APIs and the delivery of agency files with the status of every submission; master data (trainees, assessors, courses and course runs) with provenance; the mapping engine (Strategy transformers) for TMS exports and agency templates, with its AI assistant; the enforcement of each agency's allowlist; the overview and the 3D integration map.
- **Also area 1:** the AI discrepancy explainer, because it explains the master-data conflicts that area 1 detects.

**Owns**

| Layer                | Paths                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web platform         | `apps/web/src/app/`, `apps/web/src/components/` (`ui/`, `reactbits/`, `common/`), `apps/web/src/lib/`, `apps/web/src/hooks/`, `apps/web/src/i18n/` (setup and the key-parity test), `apps/web/src/styles/`, `apps/web/src/assets/`, `apps/web/components.json`                                                                                              |
| Web features         | `apps/web/src/features/{overview,connectors,integration-map,auth,settings}/`, and the master-data pages, in `features/employees/` until [B-8](../agile/backlog.md#b-8-trainees-assessors-courses-and-runs-in-master-data) renames them for trainees                                                                                                         |
| i18n namespaces      | `apps/web/src/i18n/locales/{en,zh-CN}/{common,auth,overview,employees,connectors,integrationMap,settings}.json` (`employees` renamed with B-8)                                                                                                                                                                                                              |
| API platform         | `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/common/`, `apps/api/src/config/`, `apps/api/src/infrastructure/` (Prisma, queues, LLM providers and `AiUsageTracker`, audit writer, domain events and SSE)                                                                                                                              |
| API modules          | `apps/api/src/modules/{auth,users,connectors,mapping,access,overview,ai,health}/`, master data in `modules/employees/` until B-8 renames it, plus the minimal clickstream ingest endpoint inside `apps/api/src/modules/analytics/`                                                                                                                          |
| Data                 | `apps/api/prisma/` (`schema.prisma` is shared, see the protocol below), `apps/api/prisma/seed/`                                                                                                                                                                                                                                                             |
| Mock systems         | `services/mock-*`: the TMS mock and the agency API and portal mocks ([A-14](../agile/backlog.md#a-14-tms-mock-courses-runs-trainees-and-results), [A-15](../agile/backlog.md#a-15-agency-mocks-an-api-that-acknowledges-later-and-a-portal-that-validates-files)), which replace the earlier statement's `mock-sg-hr`, `mock-cn-hq` and `mock-oa` in step 4 |
| Packages             | `packages/shared/` (package setup and shared primitives), `packages/synthetic-data/`, `packages/eslint-config/`, `packages/tsconfig/`                                                                                                                                                                                                                       |
| Infra and repository | `infra/docker/`, `docker-compose.yml`, `.env.example`, `.github/`, root workspace configuration, `scripts/`, `assets-src/3d/`                                                                                                                                                                                                                               |
| Docs                 | `docs/team/area-1-integration-core.md`, `docs/team/module-ownership.md`, `docs/architecture/`, `docs/diagrams/`, `docs/design/`, `docs/agile/`                                                                                                                                                                                                              |

**Exposes to other areas**

| Interface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kind             | Used by                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Session and current user (role, and an assessor's own runs); RBAC guard and role decorator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | API platform     | 2, 3, 4                                                                                                                   |
| Field-masking interceptor driven by the classification map; masked values carry a reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | API platform     | 2, 3, 4                                                                                                                   |
| Append-only audit writer (every write calls it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | API platform     | 2, 3, 4                                                                                                                   |
| BullMQ queue infrastructure: retries, backoff, `Idempotency-Key` handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | API platform     | 2, 3                                                                                                                      |
| `LlmGateway` and `AiUsageTracker` (every AI call is recorded)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | API platform     | 2 (the verification assistant), 3 (the rule-drafting assistant); 4 reads the records                                      |
| Domain event bus and SSE stream at `/api/v1/events`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | API platform     | 2, 3, 4                                                                                                                   |
| Error envelope, typed errors, `UPPER_SNAKE` error codes and the pagination schema in `@huitong/shared`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Contract         | All                                                                                                                       |
| `SystemConnector` and `ConnectorFactory`; the TMS connector (runs, courses and trainees in; verified results out after an approved preview, [A-16](../agile/backlog.md#a-16-read-courses-runs-and-trainees-from-the-tms), [A-17](../agile/backlog.md#a-17-write-verified-results-to-the-tms-after-an-approved-preview)), the agency API connector ([A-18](../agile/backlog.md#a-18-submit-results-through-an-agency-api-and-track-each-submission)) and the delivery of agency files ([A-19](../agile/backlog.md#a-19-deliver-an-agencys-file-and-record-the-portals-validation-report)), each submission with its status | Connector hub    | 2 (runs for the tablets; the run moves when results reach the TMS and the agencies), 3 (delivery of the files it renders) |
| Signed acknowledgements from an agency, verified and stored once ([A-3](../agile/backlog.md#a-3-receive-signed-webhooks-safely)) and published as a domain event, named in the area 1 guide when A-18 lands                                                                                                                                                                                                                                                                                                                                                                                                               | Event            | 2, 3                                                                                                                      |
| Master data: masked read and search of trainees, assessors, courses and runs; lookup by the TMS trainee ID (the only match key; a look-alike name is a possible match for review, [B-5](../agile/backlog.md#b-5-possible-matches-for-review-never-name-only-merges)); an assessor's runs ([B-8](../agile/backlog.md#b-8-trainees-assessors-courses-and-runs-in-master-data))                                                                                                                                                                                                                                              | Service and REST | 2, 3                                                                                                                      |
| Each agency's allowlist, enforced by default deny: `FieldMasker.withheld` names the fields a submission leaves out, and every withholding is audited ([B-9](../agile/backlog.md#b-9-each-agency-receives-only-its-allowlisted-fields))                                                                                                                                                                                                                                                                                                                                                                                    | Service          | 3 (agency files)                                                                                                          |
| Field transformers for dates, codes, names and enums                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Strategy classes | 3 (agency templates)                                                                                                      |
| Web: `ApiClient`, `AnalyticsTracker`, the app shell (router, sidebar, breadcrumbs, command palette, role switcher), design tokens, shared composites (`DataTable`, `PageHeader`, `EmptyState`)                                                                                                                                                                                                                                                                                                                                                                                                                            | Web platform     | 2, 3, 4                                                                                                                   |
| Raw `ClickstreamEvent` rows stored by `POST /api/v1/analytics/events`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Data             | 4                                                                                                                         |

**Consumes**

| From          | What                                                   | Why                                                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Area 4        | Each agency's allowlist entries and the masking policy | An agency receives a field only when an ACTIVE entry of its allowlist shares it; area 1 reads the entries and enforces them. Area 4 administers them ([F-7](../agile/backlog.md#f-7-administer-each-agencys-field-allowlist)): each change raises the entry's version, is audited, and calls `AccessPolicyService.reload()`. |
| Area 2        | Verified results, per run                              | Only a verified result is written to the TMS or submitted to an agency, and only after operations approve a preview (A-17 to A-19)                                                                                                                                                                                           |
| Area 3        | Rendered agency files                                  | Area 1 delivers each file to its agency's portal and records the validation report (A-19)                                                                                                                                                                                                                                    |
| Areas 2 and 3 | Summary endpoints                                      | The overview shows the week's runs, the verification queue and the submissions due ([P-10](../agile/backlog.md#p-10-overview-runs-verification-the-tms-and-submissions))                                                                                                                                                     |

**W7 mock interview: be ready to explain**

- Why each external system sits behind an Adapter and connectors are built by a Factory from configuration; how an agency with an API and an agency that takes files differ behind the same interface; and how another training provider joins through a tenant configuration.
- How the Strategy transformers turn a TMS export and an agency's layout into canonical fields and back: dates, codes and identifiers, with each mapping a versioned configuration.
- The Template Method sync job (extract → map → validate → load → audit), its retries and idempotency keys, why an apply writes exactly what its preview showed, and what happens when a sync fails halfway.
- Per-field source of truth and provenance; why trainees are matched on the TMS trainee ID and a look-alike name only ever becomes a possible match.
- How masking combines classification and the viewer's role and runs, how each agency's allowlist withholds every field it does not list, and how a withholding is audited.
- Submissions that cannot happen twice: idempotency keys, signed acknowledgements and a replay window, and the status of every submission.
- The AI mapping assistant: the provider abstraction and deterministic mock, confidence and rationale, why approval is enforced on the server, versioned mapping configs, what `AiUsageTracker` records, and why no trainee identifier reaches a prompt.
- Auth and webhook security: argon2id, cookie flags, refresh rotation with reuse detection, CSRF double-submit, and HMAC with a replay window.
- The platform decisions and their ADRs: hub-and-spoke integration (0002), pnpm workspaces (0003), TypeScript 6 and ESM (0004), NestJS 12 (0006), Prisma 7.10 (0007), shared zod contracts (0009) and the retarget (0023). Also the CI pipeline, the Docker images, and the 3D map's performance budget and accessibility fallbacks.

**Area 1 is done when** (in addition to the shared definition of done below)

- The TMS connector reads runs, courses and trainees, and writes verified results after an approved preview; one agency receives results through its API with an acknowledgement, and another receives a file whose validation report is recorded; every submission's status is tracked, all against labelled mocks.
- Running the same sync or submission twice changes nothing the second time (integration tests), and a tenant configuration connects another training provider without new code.
- E2E #3 passes: an agency receives only its allowlisted fields, and each withholding is audited.
- Unit tests cover the transformers, matching, masking and the allowlist with at least 80% line coverage.
- The AI mapping wizard saves a new versioned mapping only after approval, and every call produces an `AiUsageRecord` (tested).
- The overview, master-data, connectors and integration-map pages handle every state, and the Playwright smoke test passes with axe checks.
- `docs/team/area-1-integration-core.md` and `docs/architecture/patterns.md` are current, and the traceability rows for capabilities A, B and E are Done.

---

## Area 2: Assessment capture and verification (Azri)

**Scope.** Capability C, from the assessment to the verified result:

- the tablet checklist, which keeps working through a dropped connection and syncs afterwards
- the run's lifecycle from planned to submitted, as a definition on the workflow state machine (#147)
- operations' verification queue, and corrections with a reason that keep the original
- SLA reminders, escalations and notifications
- the verification assistant, which flags unusual records for operations to review (proposed in ADR 0023, for the owner to accept)

Area 2 starts where the TMS sync stops. Area 1 brings each run, its course and its trainees into master data; area 2 owns everything from the assessment to the verified result, with the outcomes area 3 calculates; area 1 then writes the verified results to the TMS and submits them to the agencies, and its events move the run on.

**Owns**

| Layer     | Paths                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/workflows/` (state machine, run lifecycle, event handlers, queue processors), and the capture and verification modules the owner adds                                   |
| Web       | `apps/web/src/features/workflows/`, and the checklist and verification features the owner adds (the folder names are the owner's, agreed in step 6)                                           |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/workflows.json`, and a namespace for each feature the owner adds                                                                                        |
| Data      | Workflow, checklist record, verification and correction models in `apps/api/prisma/schema.prisma` (shared file)                                                                               |
| Contracts | The workflows, capture and verification schemas in `packages/shared/`                                                                                                                         |
| Tests     | Unit specs in the area's modules, API integration tests such as `apps/api/test/workflows.int-spec.ts`, and Playwright flows for the checklist (online and offline) and the verification queue |
| Docs      | The area 2 guide in `docs/team/`                                                                                                                                                              |

**Consumes**

| From                 | Interface                                                                                      | Use                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Area 1 master data   | An assessor's runs, their trainees and courses; lookup by the TMS trainee ID                   | Load the right run onto the tablet; attach every record to a trainee                                                    |
| Area 3 course rules  | The run's rule version (criteria, critical items, outcome rule) and the competency calculation | Show the checklist the run started with; refuse to finish a trainee with a critical item unmarked; show each outcome    |
| Area 1 connector hub | Events when results reach the TMS and when an agency acknowledges a submission                 | Move the run to in the TMS and submitted                                                                                |
| Platform             | Queues, audit writer, RBAC guard, SSE, `LlmGateway`                                            | Sync jobs with retries, an audit event for every transition, live updates, and the verification assistant's model calls |

**Exposes**

| Interface                                                                                                           | Used by                                                                        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The capture, verification and workflow endpoints (`/api/v1/workflows/*` and the ones the owner adds), paginated     | The checklist and verification pages; the overview (area 1)                    |
| Run lifecycle events (captured, verified, corrected, overdue) on the event bus; names are fixed in the area 2 guide | Area 1 (the TMS write and the submissions), area 3 (dashboards), notifications |
| Verified results, per run                                                                                           | Area 1 (the TMS write and the submissions), area 3 (agency files)              |
| Verification time per run (SM-15) and records lost or duplicated by an offline sync (SM-19)                         | Success metrics, dashboards (area 3)                                           |

**W7 mock interview: be ready to explain**

- The run's states and transitions, which transitions are illegal, and how the state machine refuses them.
- How the checklist keeps results on the tablet without a connection: what is stored, how it is encrypted, when it is cleared, and how a retried sync delivers each record exactly once.
- What happens when a record changed in HuiTong while the tablet was offline, and how the conflict reaches a person.
- Why the run is driven by events (Observer and domain events, [ADR 0008](../adr/0008-jobs-events-realtime.md)) instead of one service calling each step in turn.
- How a correction keeps the original value, why it needs a reason, and how it sends the result back to verification.
- SLA timers, reminders and escalations: how they are scheduled, cancelled and tested with fake timers.
- The verification assistant: what it looks at, why it only flags and never changes a result, and why no trainee identifier reaches a model.
- How each step is audited, how the approval steps appear in the UI, and how the tablet screens meet the 44 px touch targets and every data state.

**Area 2 is done when**

- E2E #1's capture and verification steps pass: an assessor records a run on a tablet, one record syncs after a dropped connection exactly once, operations verify the run, and one result is corrected with a reason.
- No result reaches the TMS or an agency before operations verify it, and the AI never changes a result.
- Unit tests cover every transition and guard, the offline sync and the SLA rules with at least 80% line coverage. Integration tests cover the happy path, 401 and 403, and a duplicate sync.
- Every transition writes an audit event, and reminders and escalations go out through the notification adapters.
- The checklist and verification screens run on the real API with every state, in EN and 中文, tablet-first.
- The area 2 guide and the traceability rows for capability C are current.

---

## Area 3: Competency, submissions and insights (Iok Teck)

**Scope.** Capability D:

- each course's rules (criteria grouped by competency unit, critical items and an outcome rule) as versioned configuration that a training manager approves, with each run kept on the version it started with
- automatic competency calculation from those rules
- the rule-drafting assistant, which drafts a new course's rules from its assessment plan for a training manager to approve, through the `LlmGateway`
- each agency's submission file, rendered from its template and checked before delivery
- dashboards and insights for management and operations

**Owns**

| Layer     | Paths                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/attendance-leave/` (its name stays unless Iok Teck agrees to rename it in step 6) and `apps/api/src/modules/reports/`, and the modules the owner adds for course rules and submission files |
| Web       | `apps/web/src/features/attendance-leave/` (the `/reports` page included), and the features the owner adds                                                                                                         |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/attendanceLeave.json` and `reports.json`, and a namespace for each feature the owner adds                                                                                   |
| Data      | Course rule, rule version, outcome, file template and dashboard models in the shared Prisma schema                                                                                                                |
| Contracts | The area's schemas in `packages/shared/`                                                                                                                                                                          |
| Tests     | Unit specs in the area's modules (the calculation and the renderers above all), API integration tests, golden files for each agency's output, and the rule-drafting step of E2E #2                                |
| Docs      | The area 3 guide in `docs/team/`                                                                                                                                                                                  |

**Consumes**

| From                  | Interface                                                | Use                                                                                    |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Area 1 master data    | Courses and runs; lookup by the TMS trainee ID           | Attach each rule to its course and each outcome to its trainee                         |
| Area 2 capture        | The criteria recorded for each trainee; verified results | Calculate each outcome; render the files and the dashboards from verified results only |
| Area 1 mapping engine | Field transformers for dates and codes                   | Reuse them in the agency templates instead of re-implementing formats                  |
| Area 1 access policy  | `FieldMasker.withheld` for each agency (B-9)             | Leave out of a file every field the agency's allowlist does not share, and audit it    |
| Platform              | `LlmGateway`, queues, audit writer, masking, RBAC guard  | The rule-drafting assistant's model calls; approvals audited; `MANAGEMENT` read-only   |

**Exposes**

| Interface                                                                                                    | Used by                                           |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| A run's rule version and the competency calculation                                                          | Area 2 (the checklist and the verification queue) |
| Rendered agency files, ready for an approved preview                                                         | Area 1 (delivery to each portal, A-19)            |
| `/api/v1/reports/*`: dashboards and insights, read-only for `MANAGEMENT`                                     | Dashboard pages; the overview (area 1)            |
| Outcomes calculated from approved rules (SM-14), submissions accepted the first time (SM-17), rework (SM-18) | Success metrics                                   |

**W7 mock interview: be ready to explain**

- The rule model (criteria, critical items, outcome rule), how a new version is approved, and why a run keeps the version it started with.
- The calculation: why one unsatisfied critical item makes the outcome not competent, the edge cases, and how its tests cover every kind of rule.
- Why the agency renderers use the Strategy pattern, and how another agency's format is added as one more class or template.
- The golden-file tests, and how a file is checked against the agency's known rules before delivery.
- The rule-drafting assistant: why its prompt holds the assessment plan only, how its output is validated, and why nothing uses a draft before a training manager approves it.
- How the dashboards draw only on authorised data, with aggregates for management.

**Area 3 is done when**

- Course rules are versioned and approved, every outcome names its rule version, and E2E #2 passes: a new course's draft rules, approved, are used by the next run with no code change.
- Unit tests cover the calculation and the renderers with at least 80% line coverage, and a golden-file test checks each agency's output.
- Integration tests cover the happy path, 401 and 403, and an invalid rule version.
- Each agency's file holds only its allowlisted fields and carries the internal trainee ID until the client decides on national IDs.
- The dashboards are read-only for `MANAGEMENT` and show aggregates.
- The area 3 guide and the traceability rows for capability D are current.

---

## Area 4: Governance, security and monitoring (Angelyn)

**Scope.**

- **Governance:** RBAC and field-masking administration, the audit-log viewer and audit readiness, data classification, PDPA and retention, and each agency's allowlist (the cross-entity allowlist mechanism, reused).
- **Monitoring:** OpenTelemetry tracing and metrics, clickstream analytics, AI token usage and cost dashboards.
- **Deployment:** AWS, with CloudWatch.

**Owns**

| Layer     | Paths                                                                                                                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/src/modules/governance/`, `apps/api/src/modules/audit/` (viewer and query), `apps/api/src/modules/analytics/` (except the ingest endpoint)                                                                                                                                                                                            |
| Web       | `apps/web/src/features/governance/` (`/governance`: the access matrix; `/governance/classification`, `/transfers`, `/retention` and `/audit`) and `apps/web/src/features/analytics/` (`/analytics`: observability; `/analytics/clickstream` and `/ai-usage`). The transfer register screen becomes each agency's allowlist                      |
| i18n      | `apps/web/src/i18n/locales/{en,zh-CN}/governance.json`, `apps/web/src/i18n/locales/{en,zh-CN}/analytics.json`                                                                                                                                                                                                                                   |
| Infra     | `infra/aws/` (ECS Fargate, RDS PostgreSQL, ElastiCache, S3 + CloudFront, CloudWatch, Secrets Manager)                                                                                                                                                                                                                                           |
| Telemetry | Instrumentation, exporters, metric definitions, and the bootstrap in `apps/api/src/infrastructure/telemetry/`. The bootstrap loads before every area's code, so it changes through the shared-files protocol with area 1 reviewing ([ADR 0016 amendment](../adr/0016-observability-baseline.md#amendment-21-oct-2026-the-telemetry-bootstrap)). |
| Data      | Classification, allowlist entry (today `CrossBorderTransfer`) and retention models. Read access to `AuditEvent`, `AiUsageRecord` and `ClickstreamEvent`.                                                                                                                                                                                        |
| Docs      | The area 4 guide in `docs/team/`, `docs/grs/security-checklist.md` (Phase 10, with the team), the `infra/aws` README                                                                                                                                                                                                                            |

**Consumes**

| From                                       | Interface                                     | Use                                                             |
| ------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------- |
| Platform audit writer                      | `AuditEvent` rows                             | Audit-log viewer and a run's evidence (read-only for `AUDITOR`) |
| `AiUsageTracker`                           | `AiUsageRecord` rows                          | AI token and cost dashboard, budgets and alerts                 |
| Clickstream ingest (area 1)                | `ClickstreamEvent` rows                       | Funnels and page statistics                                     |
| Area 1 auth                                | Users, roles, RBAC guard, masking interceptor | Administer the role/permission matrix and the masking policy    |
| Logs with correlation ids (`X-Request-Id`) | Log stream                                    | Traces, metrics and dashboards                                  |

**Exposes**

| Interface                                                                                                                                                                          | Used by                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `/api/v1/governance/*`: access matrix, classification, each agency's allowlist, retention                                                                                          | Governance pages                               |
| Allowlist administration: each change to an entry raises its version, is audited, and calls `AccessPolicyService.reload()` so that the enforcement in area 1 follows at once (F-7) | Access policy (area 1)                         |
| `/api/v1/audit/*`: filtered, paginated, read-only; a run's evidence for an agency's check ([F-8](../agile/backlog.md#f-8-audit-readiness-the-evidence-for-a-run-in-one-place))     | Audit-log viewer; audit-trail links on records |
| `/api/v1/analytics/*` (dashboards)                                                                                                                                                 | Analytics pages                                |
| `/metrics` (prom-client); OpenTelemetry trace ids, which replace request ids as the error envelope's `traceId`                                                                     | Operations; every error state in the UI        |
| The AWS deployment, CloudWatch dashboards and alarms                                                                                                                               | The team, for W14 to W18                       |

**W7 mock interview: be ready to explain**

- The six roles and the limits that separate their duties ([GRS section 2.1](../grs/grs-by-design.md#21-roles-and-responsibilities)), how field masking combines classification with the viewer's role and runs ([ADR 0010](../adr/0010-auth-sessions-rbac-masking.md)), and how a policy change takes effect and is audited.
- How the audit log is kept append-only and tamper-evident, what an auditor can and cannot do, and how a run's evidence answers an agency's check.
- The classification levels (PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED) and why a trainee's contact details and date of birth sit where they do.
- What an agency's allowlist entry records (the fields, the purpose, the approver, the version), and how it reflects the PDPA's purpose limitation. These are design considerations; the client confirms them ([A-79](../assumptions.md), [A-81](../assumptions.md)).
- How retention works for assessment records, which an agency may check for a period, and what happens to data that expires ([A-80](../assumptions.md)).
- OpenTelemetry traces across API → queue → connector, the metrics on `/metrics`, and how the `traceId` in an error envelope leads to the trace.
- Clickstream privacy: route patterns instead of raw URLs, no input values, the consent toggle and Global Privacy Control.
- The observability baseline you extend ([ADR 0016](../adr/0016-observability-baseline.md)); AI token and cost tracking, budgets and alerts; the AWS architecture and the CloudWatch setup ([ADR 0014](../adr/0014-deployment-docker-aws.md)).

**Area 4 is done when**

- The governance tabs, each agency's allowlist and the audit-log viewer run on the real API. Changes to roles, masking, classification, allowlist entries and retention are restricted to authorised roles and audited.
- Unit tests cover the policy logic (masking policy, allowlist checks, retention rules) with at least 80% line coverage. Each module has integration tests for the happy path and for 401 and 403. One test shows that audit events cannot be changed or deleted through the API.
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
| The telemetry bootstrap (`apps/api/src/infrastructure/telemetry/`)                                                                     | Loads before every area's code              | Area 4 owns it; area 1 reviews each change, and a change ships in its own PR.                                                                                                                                              |
| `.github/` (CI, templates, CODEOWNERS)                                                                                                 | Gates every PR                              | The platform owner changes these; others propose.                                                                                                                                                                          |
| [requirements-traceability.md](../requirements-traceability.md), [assumptions.md](../assumptions.md), `docs/design/reactbits-usage.md` | Team registers                              | Update your own rows in your PR; never renumber ids.                                                                                                                                                                       |

**How to change a shared file**

1. Put the change in its own small PR, separate from feature logic (for example `chore/workflows-schema-sla`). It then gets reviewed and merged quickly.
2. Rebase on `main` first. For a schema change, regenerate the migration if another migration has landed since.
3. Request a review from the platform owner (Richie). Once CODEOWNERS is filled in, GitHub requests it automatically.
4. After the merge, tell the team in the team channel so everyone rebases.
5. A breaking contract change also needs an ADR and the approval of each owner who consumes the contract.

**CODEOWNERS.** `.github/CODEOWNERS` is a placeholder that names each area's folders. Once the backups are agreed ([T-1](../agile/backlog.md#t-1-agree-area-owners-and-fill-codeowners)), the team adds each member's GitHub username, mapping the shared files above to the platform owner and each area's folders to its owner. Branch protection on `main` then requires a code-owner review.

**Implementation guides.** Each area has a guide in `docs/team/`: area 1's is rewritten for #5 with this file, and the guides of areas 2 to 4 with their owners in step 6. Each guide covers:

- the goal, with user stories and acceptance criteria
- the recommended design: patterns, data flow and sequence
- a step-by-step build plan
- the risks
- how the area plugs into the platform
- the assessment requirements it covers
