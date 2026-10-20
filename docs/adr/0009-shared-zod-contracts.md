# ADR 0009: Shared zod schemas as the single contract

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4, M5 · capabilities A–G

## Context

Every request shape in HuiTong is described in at least three places:

- a web form, validated as the user types, with errors shown in English or 中文;
- the API, which must validate all external input at the boundary (`CLAUDE.md` section 7; OWASP API Security Top 10);
- Swagger at `/api/docs`, the contract that future subsidiaries' integrators read ([ADR 0006](0006-api-nestjs-layered-modules.md)).

Responses are shared too: the web's `ApiClient` and the masked employee views depend on their exact shape. If each place describes a shape separately, the descriptions drift, and the drift appears as a defect in use rather than as a type error.

`CLAUDE.md` allows "class-validator DTOs or zod pipes" and puts zod schemas in `@huitong/shared`. Two features of the current stack make a single source practical:

- NestJS 12 ships a `StandardSchemaValidationPipe`, and its parameter decorators accept a schema directly: `@Body({ schema })`, `@Query({ schema })`, `@Param({ schema })`.
- `@nestjs/swagger` 12 reads Standard JSON Schema, which zod 4 implements, for request parameters and for responses (the `standardSchema` option on `@ApiOkResponse` and the other response decorators).

## Decision

We will define every contract between the web and the API **once, as a zod 4 schema in `@huitong/shared`**, and derive everything else from it.

| Consumer          | How it uses the schema                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Types             | `z.input` and `z.output` inferred types; no hand-written duplicate interfaces                                                                                                                                                                                                                          |
| Web forms         | React Hook Form 7 with `zodResolver` from `@hookform/resolvers` 5.9.2                                                                                                                                                                                                                                  |
| API input         | `StandardSchemaValidationPipe`, registered globally. Controllers declare `@Body({ schema })`, `@Query({ schema })` or `@Param({ schema })`. The pipe's exception factory produces the standard envelope `{ error: { code, message, details, traceId } }`, with each issue's path and code in `details` |
| API documentation | `@nestjs/swagger` 12 converts the same schemas into the OpenAPI document; responses use `standardSchema` on the response decorators                                                                                                                                                                    |
| Web client        | `ApiClient` methods are typed from the response schemas                                                                                                                                                                                                                                                |

**Rules**

- **Folders by domain** in `packages/shared/src/` (`auth/`, `employees/`, `connectors/`, `workflows/` and so on). Each area owns its folder. Shared primitives (roles, error codes, pagination, classification, event names) belong to area 1 and change additively only ([module ownership](../team/module-ownership.md#shared-files-protocol)).
- **Messages are i18n keys, not prose.** Schemas attach error keys that the web translates ([ADR 0015](0015-i18n-and-fonts.md)), so the shared package holds no user-facing English.
- **Transforms are deliberate.** Where a schema trims or parses values, its input and output types differ. Swagger documents the input shape for requests and the output shape for responses.
- **External systems are not shared contracts.** Each connector validates its source payloads with its own zod schemas inside its adapter: SG HR's English JSON, and the CN HQ envelope `{ 返回码, 消息, 数据 }` (A-01, A-02). The mocks own their schemas separately ([ADR 0013](0013-mock-external-systems.md)), so shared code cannot hide a connector bug.
- The same approach covers environment configuration (validated at start-up), domain event payloads ([ADR 0008](0008-jobs-events-realtime.md)) and AI output ([ADR 0011](0011-ai-gateway-human-in-the-loop.md)).

## Consequences

### Positive

- One pull request changes a contract and every consumer, and typechecking finds every place that must follow ([ADR 0003](0003-pnpm-workspaces-monorepo.md)).
- Swagger cannot drift from validation, because both come from the same schema.
- Validation errors have one shape everywhere and translate cleanly.
- No third-party bridge between Nest and zod has to keep pace with NestJS releases.

### Negative

- zod ships in the web bundle and counts against the 250 KB initial budget. `zod/mini` is the fallback if its size matters.
- `@huitong/shared` must build before the apps that import it, and a broken schema breaks every consumer at once.
- Standard Schema support is new in NestJS 12 and `@nestjs/swagger` 12, so examples are scarce. Some refinements and transforms have no JSON Schema form and need a written description instead.
- Every contract change touches both sides. The additive-only rule and owner approval keep that cost visible.

## Alternatives considered

| Option                                        | Why rejected                                                                                                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| class-validator DTOs                          | Decorated classes duplicate the types the web needs, cannot drive React Hook Form without shipping class-validator and class-transformer to the browser, and still need Swagger annotations. Three descriptions of one shape is the drift we want to avoid |
| zod through a third-party bridge (nestjs-zod) | The usual approach before NestJS 12. Now redundant, and each major Nest release would wait on the bridge                                                                                                                                                   |
| OpenAPI-first with code generation            | Language-neutral, but means hand-written YAML plus a generation step. We still publish an OpenAPI document, generated from the schemas                                                                                                                     |
| Valibot or ArkType                            | Also Standard Schema compliant, and Valibot is smaller. `CLAUDE.md` fixes zod, which the team knows best. Because the pipe and Swagger depend on Standard Schema rather than on zod itself, a later switch stays possible                                  |
