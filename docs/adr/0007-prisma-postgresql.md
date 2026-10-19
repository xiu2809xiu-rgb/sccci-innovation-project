# ADR 0007: Prisma 7.10 on PostgreSQL 18

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M2, M4 · capabilities B, C, D, F

## Context

HuiTong's data is relational, and it must stay correct under retries and concurrent writes:

- **Employee master (capability B):** employees, source records, per-field provenance, change history and conflicts. Matching must never create two records for one person, so entity + `employeeNo` and source system + source record id are unique ([R-05](../grs/grs-by-design.md#32-register)).
- **Governance (capability F):** each audit event is written in the same transaction as the change it records, a trigger rejects UPDATE, DELETE and TRUNCATE on the audit table, and an advisory lock serialises the hash chain ([GRS 2.4](../grs/grs-by-design.md#24-audit)).
- **Every other area:** connectors and versioned mapping configs, sync runs, workflows, attendance and leave, reports, clickstream events and AI usage records.

One database serves four owners, so the schema is a shared file with its own change protocol ([module ownership](../team/module-ownership.md#shared-files-protocol)). Volumes are small: about 120 synthetic employees and three months of attendance and leave. Real volumes are still open (A-11, Q-19, Q-20).

[`CLAUDE.md`](../../CLAUDE.md) fixes Prisma + PostgreSQL. This ADR settles the versions and how Prisma 7 fits an ESM NestJS app ([ADR 0004](0004-typescript-6-esm.md)). Prisma 7 changed several defaults:

- the `prisma-client` generator writes TypeScript into a folder we choose, instead of `node_modules`;
- configuration moves to `prisma.config.ts`, and the client connects through a driver adapter;
- `migrate dev` no longer runs `prisma generate` or the seed.

Prisma 8 is still a release candidate; 7.10.1 is the latest stable release.

## Decision

We will use **Prisma 7.10.1** with **PostgreSQL 18**.

| Concern                      | Decision                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema                       | One `apps/api/prisma/schema.prisma` for all areas. One migration per PR, created on the latest `main`. An `@@index` for every query path                                                                                             |
| Configuration                | `apps/api/prisma.config.ts`: schema path, migrations folder, seed command, and the connection URL read from the environment                                                                                                          |
| Client                       | `prisma-client` generator with an explicit output in `apps/api/src/generated/prisma`, emitting ESM with `.js` import specifiers to match `nodenext`. The folder is a build artefact: git-ignored and excluded from lint and coverage |
| Connection                   | `@prisma/adapter-pg` (node-postgres), created once by a `PrismaService` in `apps/api/src/infrastructure/prisma/`                                                                                                                     |
| Access                       | Repositories are the only Prisma callers ([ADR 0006](0006-api-nestjs-layered-modules.md)). Raw SQL only as tagged templates, which are parameterised; the `Unsafe` raw-query methods are never used (M4.1-09)                        |
| Generate and seed            | Explicit steps. `prisma generate` runs before the API's `build`, `typecheck` and `test` scripts and in the Docker build. `pnpm db:seed` runs the seed                                                                                |
| SQL that Prisma cannot model | The audit trigger and similar objects are added to a migration created with `migrate dev --create-only`                                                                                                                              |
| Container start (compose)    | `prisma migrate deploy`, then the seed, then the app. The seed is idempotent (upserts on natural keys such as `employeeNo` and email), so restarts are safe                                                                          |
| AWS                          | Migrations run as a one-off task before each deployment, not on every container start. The seed runs only in demo environments, which hold synthetic data                                                                            |

PostgreSQL 18 runs in docker compose (`postgres:18` on Alpine) and is the major version we target on Amazon RDS ([ADR 0014](0014-deployment-docker-aws.md)).

## Consequences

### Positive

- One declarative schema is the data model all four owners read and review, and the ER diagram (Phase 8) is drawn from it.
- Generated types flow into the repositories, so a renamed column fails typechecking instead of failing at run time.
- Integrity lives in the database: unique constraints, foreign keys, transactions and the audit trigger hold even when application code has a bug.
- Prisma 7's client needs no native query-engine binary, which keeps the Alpine runtime image simple.

### Negative

- Most published examples still show Prisma 6. Owners follow the Prisma 7 documentation, not older tutorials.
- A forgotten `prisma generate` causes confusing type errors. The scripts run it, but editors may need a restart.
- `schema.prisma` is a merge hotspot. The shared-files protocol (rebase first, one migration per PR) manages it.
- Triggers and advisory locks live in migration SQL, so reviewers read the migrations as well as the schema.
- The runtime image must already contain the Prisma CLI and the migrations, because the container cannot write to its own files.
- PostgreSQL 18 images keep data under `/var/lib/postgresql/18/docker`, so the compose volume mounts `/var/lib/postgresql`, not the older `/var/lib/postgresql/data` path.

## Alternatives considered

| Option                                                | Why rejected                                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma 8                                              | Still a release candidate. We move when it is stable and our tests pass on it                                                                       |
| Prisma 6 with the `prisma-client-js` generator        | Generates into `node_modules`, ships a native engine by default, and suits CommonJS better than our ESM set-up                                      |
| TypeORM                                               | Nest's traditional pairing, but query results are typed less strictly and generated migrations need more manual correction                          |
| Drizzle ORM or Kysely                                 | Lightweight, type-safe and close to SQL; a credible choice. `CLAUDE.md` fixes Prisma, and one schema file gives four owners a single readable model |
| One schema file per area (Prisma's multi-file schema) | Fewer merge conflicts, but it splits a model whose relations cross areas. Kept in reserve if conflicts become frequent                              |
| MySQL or SQL Server                                   | No advantage for this workload. HuiTong uses PostgreSQL's JSONB for source snapshots and webhook bodies, its triggers and its advisory locks        |
