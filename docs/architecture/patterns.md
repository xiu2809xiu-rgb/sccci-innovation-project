# Design patterns

The register CLAUDE.md section 7 asks for: each design pattern HuiTong uses, why it earns its place, where it lives and how to extend it. A pattern is used only where it solves a problem the code really has. Areas 2 to 4 add their rows (for example area 2's workflow state machine and area 3's report renderers) in the pull request that introduces them.

| Pattern                                                               | Used for                                                                     | Owner                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| [Adapter](#adapter)                                                   | One external system behind one interface                                     | Area 1                                 |
| [Factory](#factory)                                                   | Building an adapter from a connector's configuration                         | Area 1                                 |
| [Strategy](#strategy)                                                 | Field transforms; language-model providers                                   | Area 1                                 |
| [Template Method](#template-method)                                   | The sync pipeline: extract, map, validate, load, audit                       | Area 1                                 |
| [Observer (domain events)](#observer-domain-events)                   | Modules reacting to each other without depending on each other; live updates | Area 1 (bus), every area (subscribers) |
| [Repository](#repository)                                             | The only place Prisma is called                                              | Every area                             |
| [Gateway](#gateway)                                                   | The one way to call a language model                                         | Area 1                                 |
| [Transactional outbox](#transactional-outbox)                         | Not losing an OA approval between storing it and publishing it               | Area 1                                 |
| [Idempotency key](#idempotency-key)                                   | A repeated request or delivery doing its work once                           | Area 1                                 |
| [Guards, interceptors and filters](#guards-interceptors-and-filters)  | Authentication, CSRF, permissions, masking and errors on every route         | Area 1                                 |
| [Injected services in the web app](#injected-services-in-the-web-app) | Class-based browser services that tests can replace                          | Area 1                                 |

## Adapter

**What.** Each external system is wrapped in a class that turns its API into one interface.

**Why here.** SG HR, CN HQ's SAP and OA differ in authentication, paging, field names and date formats, and the real systems are unknown until the client meeting. The sync code sees only [`SystemConnector`](../../apps/api/src/modules/connectors/adapters/system-connector.ts) (`checkHealth`, `fetchEmployees`), so replacing a mock with the real system is one class.

**Where.** [`adapters/`](../../apps/api/src/modules/connectors/adapters/): `SgHrRestConnector`, `CnHqSapConnector`, `OaWebhookConnector` and `OfflineConnector`.

**Extend.** Implement `SystemConnector` for the new system, validate its responses with a zod schema (through `HttpJsonClient`), and register it in the factory.

## Factory

**What.** One place decides which class to build from configuration.

**Why here.** Connectors are rows in the database, so a new subsidiary is configuration, not code. Credentials must never come from those rows.

**Where.** [`ConnectorFactory`](../../apps/api/src/modules/connectors/connector-factory.ts) builds the adapter for a connector's type from its non-secret settings and reads credentials only from the typed configuration (environment or secret store).

**Extend.** Add a case for the new connector type.

## Strategy

**What.** A family of interchangeable algorithms behind one interface, chosen at run time.

**Why here.** Field mappings are data: each mapping names a transform `kind`, and the engine must run whichever one it names. The language model is a deployment choice (mock, Bedrock or OpenAI), not a code change.

**Where.**

- Transforms: [`FieldTransformer`](../../apps/api/src/modules/mapping/transformers/field-transformer.ts), one class per kind in [`transformers/`](../../apps/api/src/modules/mapping/transformers/), found through [`TransformerRegistry`](../../apps/api/src/modules/mapping/transformers/transformer-registry.ts) and run by [`MappingEngine`](../../apps/api/src/modules/mapping/mapping-engine.ts).
- Models: [`LlmProvider`](../../apps/api/src/infrastructure/llm/llm.types.ts), implemented by the [mock, Bedrock and OpenAI providers](../../apps/api/src/infrastructure/llm/providers/) and chosen by `LLM_PROVIDER` in [`llm.module.ts`](../../apps/api/src/infrastructure/llm/llm.module.ts).

**Extend.** Add the kind to `transformSpecSchema` in [`field-mapping.ts`](../../packages/shared/src/mapping/field-mapping.ts), write one class and register it. A new provider implements `LlmProvider`.

## Template Method

**What.** A base class fixes the steps of an algorithm and their order; subclasses fill in the steps.

**Why here.** Every sync must extract, map, validate, load and audit in that order, with the same progress reporting, counting and per-record failure handling, whatever the data. Getting that right once matters more than any one sync.

**Where.** [`SyncPipeline`](../../apps/api/src/modules/connectors/sync/sync-pipeline.ts) is the template; [`EmployeeSyncPipeline`](../../apps/api/src/modules/connectors/sync/employee-sync.pipeline.ts) supplies the employee steps, and [`SyncProcessor`](../../apps/api/src/modules/connectors/sync/sync.processor.ts) runs it as a BullMQ job.

**Extend.** Area 3's attendance and leave ingestion can subclass `SyncPipeline` with its own five steps and inherit the progress, counts and failure handling.

## Observer (domain events)

**What.** Publishers announce what happened; subscribers react, and neither knows about the other.

**Why here.** Area 2 must start a workflow when OA approves a manpower request, without area 1 depending on area 2's code ([module ownership](../team/module-ownership.md), rule 3). The browser needs to know when a sync moves on without polling.

**Where.**

- [`DomainEventBus`](../../apps/api/src/infrastructure/events/domain-event-bus.ts): typed events between modules, published after the publishing transaction commits; subscribers use `@OnEvent`. The catalogue is [`domain-events.ts`](../../packages/shared/src/events/domain-events.ts) (`oa.approval.completed`).
- [`RealtimeService`](../../apps/api/src/infrastructure/events/realtime.service.ts): fans live events out to the Server-Sent Events stream; [`events.ts`](../../packages/shared/src/realtime/events.ts) lists them. Live messages carry ids, status and counts, never field values ([ADR 0008](../adr/0008-jobs-events-realtime.md)).

**Extend.** Add the event name and its payload schema to the shared catalogue, publish after commit, and keep subscribers thin: validate, then enqueue durable work.

## Repository

**What.** One class per aggregate owns its data access.

**Why here.** CLAUDE.md section 7 makes repositories the only place Prisma is called, so services hold the rules and every query path sits in one place, where its database index can be checked.

**Where.** Every `*.repository.ts`, for example [`EmployeesRepository`](../../apps/api/src/modules/employees/employees.repository.ts), whose writes take the caller's transaction so a master change, its provenance, its history line and its conflict commit together, and [`SyncRunsRepository`](../../apps/api/src/modules/connectors/sync/sync-runs.repository.ts).

**Head starts.** A repository can be an abstract class that the module binds, so a service does not know where its data comes from. [`WorkflowsRepository`](../../apps/api/src/modules/workflows/workflows.repository.ts) is bound to [`MockWorkflowsRepository`](../../apps/api/src/modules/workflows/mock/mock-workflows.repository.ts), which serves typed sample data, until area 2 binds its Prisma repository in [`WorkflowsModule`](../../apps/api/src/modules/workflows/workflows.module.ts). Area 3's [`ConsolidationRepository`](../../apps/api/src/modules/attendance-leave/consolidation.repository.ts) and [`ManagementReportsRepository`](../../apps/api/src/modules/reports/management-reports.repository.ts) work the same way, beside real Prisma repositories for the seeded leave rules and the template. The controllers and the contract stay as they are.

**Extend.** Never import another area's repository: depend on the service its module exports.

## Gateway

**What.** A single object that every call to an outside service goes through.

**Why here.** Every language-model call must be recorded (tokens, model, latency, cost, feature, user, outcome), and none may write to a system of record ([ADR 0011](../adr/0011-ai-gateway-human-in-the-loop.md)). One entry point makes both rules hold by construction.

**Where.** [`LlmGateway`](../../apps/api/src/infrastructure/llm/llm.gateway.ts), which records through [`AiUsageTracker`](../../apps/api/src/infrastructure/llm/ai-usage.tracker.ts).

**Extend.** A new AI feature calls the gateway with its own feature name; it never calls a provider directly.

## Transactional outbox

**What.** The record of an event is stored in the same place as the work, and a background job publishes whatever was stored but not yet handled.

**Why here.** An OA approval that is stored but never published, because the API stopped in between or no subscriber exists yet, would silently never start its workflow.

**Where.** The stored `InboundWebhookEvent` is the outbox row ([`OaWebhookService`](../../apps/api/src/modules/connectors/webhooks/oa-webhook.service.ts)); [`WebhookOutboxProcessor`](../../apps/api/src/modules/connectors/webhooks/webhook-outbox.processor.ts) republishes waiting events every two minutes.

## Idempotency key

**What.** A key that makes a repeated request or delivery produce the original result instead of doing the work again.

**Why here.** Browsers retry, users double-click, and OA redelivers webhooks. A second sync run or a second workflow from one approval would be wrong.

**Where.** The `Idempotency-Key` header on starting a sync maps to the same run ([`SyncService`](../../apps/api/src/modules/connectors/sync/sync.service.ts)); the web client sends a fresh key per start ([`sync-runs.ts`](../../apps/web/src/features/connectors/api/sync-runs.ts)). Stored webhooks are unique on `(source, eventId)` ([`WebhookEventsRepository`](../../apps/api/src/modules/connectors/webhooks/webhook-events.repository.ts)), and event subscribers ignore ids they have handled.

## Guards, interceptors and filters

**What.** NestJS's pipeline: guards decide whether a request may run, interceptors wrap what it returns, and a filter turns every error into one shape.

**Why here.** Authentication, CSRF protection, permission checks, masking and the error envelope must apply to every route, without each controller remembering them.

**Where.** [`AuthGuard`](../../apps/api/src/common/guards/auth.guard.ts), [`CsrfGuard`](../../apps/api/src/common/guards/csrf.guard.ts) and [`PermissionsGuard`](../../apps/api/src/common/guards/permissions.guard.ts) run in that order after the rate limiter, registered globally in [`app.module.ts`](../../apps/api/src/app.module.ts); [`FieldMaskingInterceptor`](../../apps/api/src/common/interceptors/field-masking.interceptor.ts) masks responses by role and entity; [`MockDataInterceptor`](../../apps/api/src/common/interceptors/mock-data.interceptor.ts) adds `meta.mock` to the responses of routes marked `@ServesMockData()`, so the UI labels sample data; [`GlobalExceptionFilter`](../../apps/api/src/common/filters/global-exception.filter.ts) returns `{ error: { code, message, details, traceId } }`. [`AuditLogService`](../../apps/api/src/infrastructure/audit/audit-log.service.ts), which services call for each write, keeps the append-only, hash-chained audit trail.

## Injected services in the web app

**What.** The browser's long-lived services are classes created once and handed down through a React context, not imported singletons.

**Why here.** CLAUDE.md section 7 keeps classes for non-UI services and rules out static singletons. Injecting them lets a page test swap the API for a fake one.

**Where.** [`ApiClient`](../../apps/web/src/lib/api-client.ts), [`AnalyticsTracker`](../../apps/web/src/lib/analytics-tracker.ts) and [`RealtimeClient`](../../apps/web/src/lib/realtime-client.ts), with the query client and i18n, are provided through [`dependencies-context.ts`](../../apps/web/src/app/providers/dependencies-context.ts); [`render-app.tsx`](../../apps/web/src/test/render-app.tsx) builds them with a fake API for tests. [`Formatters`](../../apps/web/src/lib/formatters.ts) holds no state beyond its locale, so `useFormatters` creates one per UI language instead.
