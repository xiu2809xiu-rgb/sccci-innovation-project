# ADR 0006: NestJS 12 API with layered domain modules

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4, M5 · capabilities A–G

## Context

[`CLAUDE.md`](../../CLAUDE.md) section 7 sets the backend rules:

- NestJS, with modular, class-based dependency injection;
- four layers: thin controllers, services (use cases), repositories (the only Prisma callers), and domain classes holding the invariants;
- patterns only where they earn their place (Adapter, Factory, Strategy, Template Method, Observer, Repository), plus SOLID and constructor injection.

Beyond those rules:

- **Parallel ownership.** Four owners must work in parallel without touching each other's internals, and each must explain their own module at assessment.
- **Uniform protection.** Every route needs the same cross-cutting protection: authentication, RBAC, field masking, input validation, an audit of every write, one error envelope, correlation ids and pagination.
- **A standard interface.** The client wants future subsidiaries to connect through standardised interfaces, which points to documented REST (OpenAPI).

## Decision

We will build the API on **NestJS 12 (ESM, pinned to 12.1.3)** on Node.js 24, using Nest's default Express adapter.

**Modules mirror ownership** ([`../team/module-ownership.md`](../team/module-ownership.md)):

| Area                                   | Modules in `apps/api/src/modules/`                                    |
| -------------------------------------- | --------------------------------------------------------------------- |
| 1. Integration Core and platform       | `auth`, `users`, `employees`, `connectors`, `mapping`, `ai`, `health` |
| 2. Workflow automation                 | `workflows`                                                           |
| 3. Attendance, leave and reporting     | `attendance-leave`, `reports`                                         |
| 4. Governance, security and monitoring | `governance`, `audit`, `analytics`                                    |

Shared code lives outside `modules/`, and all of it belongs to area 1:

- `common/`: guards, interceptors, filters, decorators and pipes;
- `config/`: typed configuration, validated at start-up;
- `infrastructure/`: Prisma, queues, LLM providers and `AiUsageTracker`, the audit writer, events and SSE, and the telemetry bootstrap.

**Layers inside a module.** Dependencies point inwards:

| Layer      | Does                                                                                                   | Must not                           |
| ---------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Controller | Routing, permission metadata, schema validation, status codes                                          | Hold business rules or call Prisma |
| Service    | One use case: orchestration, object-level checks (entity scope), domain events, audit                  | Build HTTP responses               |
| Repository | All Prisma access for its aggregate                                                                    | Be imported by another module      |
| Domain     | Classes and value objects that enforce invariants (`Employee`, `EmployeeId`, `LeaveType`, `DateRange`) | Import Nest or Prisma              |

**Between modules.** A module exposes exported services as its public API, or communicates through domain events ([ADR 0008](0008-jobs-events-realtime.md)). For example, `workflows` subscribes to `oa.approval.completed` from `connectors` instead of calling connector internals. No module imports another module's repository.

**Injection.** Constructor injection only. TypeScript interfaces do not exist at runtime, so swappable dependencies are bound to tokens (abstract classes or symbols). Examples are `SystemConnector` adapters, LLM providers and report renderers.

**Global request pipeline**, registered once:

1. **Middleware.** Correlation id (`X-Request-Id`), helmet 8 with a strict CSP, a CORS allow-list, and cookie parsing.
2. **Guards.** Rate limiting (@nestjs/throttler 6), authentication (deny by default; `@Public()` opts out), and permissions ([ADR 0010](0010-auth-sessions-rbac-masking.md)).
3. **Pipe.** `StandardSchemaValidationPipe` with the shared zod schemas ([ADR 0009](0009-shared-zod-contracts.md)).
4. **Interceptors.** Field masking, and the response envelope: `{ data }`, or `{ data, meta: { page, pageSize, total } }` for lists.
5. **Filter.** One global exception filter that turns typed errors into `{ error: { code, message, details, traceId } }`, where `code` is an UPPER_SNAKE string from `@huitong/shared`.

**Conventions**

- REST lives under `/api/v1`, and every list is paginated (`?page=&pageSize=`, maximum 100).
- POSTs that start work accept an `Idempotency-Key` header.
- Swagger UI is served at `/api/docs`.
- Services record every write through the append-only audit writer.

## Consequences

### Positive

- Each owner works in their own module folder. Boundaries show up in imports and are checked in review.
- Domain classes have no framework imports, so the logic that needs 80% coverage is unit-tested without Nest or a database.
- Security and error handling are uniform: a new route is authenticated, validated, masked and audited by default.
- Nest's dependency injection suits the patterns we need: Factory for connectors, Strategy providers, and Observer through events.
- Generated OpenAPI documentation gives future subsidiaries' integrators a contract to build against.

### Negative

- Four layers is ceremony for simple reads. We accept it for consistency; a pass-through service is allowed.
- Nest relies on legacy decorators and `reflect-metadata`, so every compiler and test transformer must emit decorator metadata ([ADR 0004](0004-typescript-6-esm.md), [ADR 0012](0012-testing-strategy.md)).
- NestJS 12 is a recent, ESM-only major release. Community examples lag, and third-party Nest modules must be checked for compatibility before adoption.
- Module imports can form cycles. We break them with events, or by moving shared logic down a layer, not with `forwardRef`.

## Alternatives considered

| Option                                             | Why rejected                                                                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain Express or Fastify with our own structure    | Lighter, but we would rebuild dependency injection, guards and OpenAPI integration, and four owners would drift into four styles                                                                          |
| tRPC or another TypeScript-only RPC                | End-to-end types, but it ties clients to TypeScript. Future subsidiaries' systems need a documented, language-neutral REST interface                                                                      |
| GraphQL                                            | Flexible queries suit reports, but field-level authorisation, masking, caching and pagination all get harder. REST with pagination covers the PoC                                                         |
| Services calling Prisma directly (no repositories) | Less code, but it ties business rules to the ORM and makes unit tests need a database. It also contradicts `CLAUDE.md`                                                                                    |
| One microservice per area                          | Separate deployments, networking and distributed tracing are more than a PoC can justify. The modular monolith keeps the boundaries and can split along module lines later, starting with the sync worker |
