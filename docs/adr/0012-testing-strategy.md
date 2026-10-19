# ADR 0012: Testing strategy with Vitest, Supertest and Playwright

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4, M5 · capabilities A–G

## Context

`CLAUDE.md` section 7 sets the bar:

- unit tests for domain logic (mapping, transformers, the workflow state machine, masking) with at least 80% line coverage on those modules;
- Supertest integration tests for every API module: the happy path plus an auth failure;
- a Playwright smoke test (log in → overview → employee master → approve a mapping → run a consolidation) with axe accessibility checks;
- all of it running in CI.

Constraints:

- **ESM only.** NestJS 12 and Prisma 7 ship as ESM ([ADR 0004](0004-typescript-6-esm.md)), and Jest's ESM support has long relied on an experimental Node flag.
- **Decorator metadata.** Nest's dependency injection reads `design:paramtypes`, so the test transformer must emit decorator metadata ([ADR 0006](0006-api-nestjs-layered-modules.md)). The usual workaround has been an SWC plugin.
- **Four owners.** Each must run and explain their own tests, ideally with one tool.
- **Defects sit at boundaries:** source payloads, mappings, retries and permissions (R-04 to R-06, R-10, R-11 in the [risk register](../grs/grs-by-design.md#32-register)).

## Decision

**Vitest 5 is the only test runner,** in every package, including the NestJS API. Vite 8's transformer honours `experimentalDecorators` and `emitDecoratorMetadata` from the tsconfig, so no SWC plugin is needed. Phase 2 verified this: `apps/api/test/health.int-spec.ts` boots a Nest testing module whose controller receives `HealthCheckService` and `MemoryHealthIndicator` through constructor parameter types alone, and it passes under Vitest 5.0.5. Production builds still use `nest build` (tsc), and the same test catches any drift between the two compilers.

| Layer              | Location and naming                                                                                  | Runs against                                                                                                 | Owner                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Unit               | `*.spec.ts` next to the code in Node packages; `*.test.ts(x)` in `apps/web` (jsdom, Testing Library) | No I/O: domain classes, transformers, state machine, masking, validators; services with fake repositories    | Each area                                          |
| API integration    | `apps/api/test/<module>.int-spec.ts`                                                                 | The Nest app through Supertest 7, with real PostgreSQL and Redis                                             | Each area: happy path, 401 and 403 for each module |
| Connector contract | Beside each adapter                                                                                  | Responses recorded from the mocks now, from client samples later ([ADR 0013](0013-mock-external-systems.md)) | Area 1                                             |
| Mock services      | `services/mock-*/src/*.spec.ts`                                                                      | Supertest against each Express app                                                                           | Area 1                                             |
| End to end         | `apps/web/e2e/`                                                                                      | Playwright 1.64 with `@axe-core/playwright` 4.14, against the full docker compose stack                      | Area 1; area 3 for the consolidation step          |

The `.int-spec.ts` suffix replaces the `.e2e-spec.ts` name used in early planning, so "e2e" always means browser tests.

**Rules**

- **Coverage** with `@vitest/coverage-v8`, reported in CI. An 80% line threshold is added for each domain folder as its logic lands, so CI fails when a domain module drops below the bar.
- **Database specs** run in their own Vitest project with file parallelism off, against a database migrated once per run. Each spec creates the data it needs.
- **Determinism.** The `mock` LLM provider, the seeded synthetic dataset and fake timers for SLA logic make results repeatable. No test calls the network outside the stack.
- **Security cases are tests:** a missing CSRF token, a reused refresh token, a tampered or stale webhook, a masked field for each role, and a route without a permission declaration.
- **Accessibility.** axe runs on every page of the smoke flow with the `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa` tags. Keyboard paths are scripted, not only scanned.
- **CI** (GitHub Actions): install with a cached store, lint, typecheck, unit and integration tests with PostgreSQL 18 and Redis 8 service containers, build and docker build. A Playwright job then runs against the compose stack and keeps traces and screenshots on failure.

## Consequences

### Positive

- One runner, one configuration style and one assertion API across the web, API, mocks and shared code.
- Vitest runs ESM and TypeScript natively and quickly, which keeps the local feedback loop short.
- Integration tests use the real database, so constraints, triggers and transactions are tested where they live.
- The smoke test exercises the same stack that `docker compose up --build` must bring up.

### Negative

- Vite's transformer and tsc are different compilers, so a decorator edge case could pass in one and fail in the other. The DI test and the CI build both guard against it.
- Integration tests need PostgreSQL and Redis locally (through docker compose) and run slower than unit tests.
- Serial database specs slow down as the suite grows; a schema per worker is the next step if they do.
- Automated axe checks find only part of the accessibility problems, so manual keyboard and screen-reader checks stay on the PR checklist.

## Alternatives considered

| Option                            | Why rejected                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Jest                              | ESM support needs experimental flags and a separate transform, and the web would still use Vitest: two runners to learn                 |
| Vitest with `unplugin-swc`        | The standard way to emit decorator metadata with Vite's earlier esbuild transformer. No longer needed, and one fewer plugin to maintain |
| `node:test`                       | Built in, but weaker mocking, coverage and watch mode, and no jsdom set-up for the web                                                  |
| Cypress                           | Playwright runs Chromium, Firefox and WebKit, runs tests in parallel without a paid service, and integrates axe directly                |
| Testcontainers for each test file | Excellent isolation, but slow on the team's Windows laptops. CI service containers and compose are simpler                              |
| Pact consumer-driven contracts    | Needs the provider to run our contracts, which vendors will not do. Recorded-response contract tests give most of the value             |
