# Architecture decision records

This folder records the significant technical decisions behind HuiTong 汇通, the HR integration and workflow-automation layer for Organisation E (Problem Statement #17). Each record gives the context, the decision, its consequences and the options we rejected. That way any team member can explain _why_ the platform is built the way it is, at the mock interview (week 7), the technical review (week 13) and the final presentation (week 18).

[`CLAUDE.md`](../../CLAUDE.md) section 5 lists _what_ was decided, and these records explain _why_. A pull request that changes a decision updates both.

## Index

| No.                                              | Title                                                                   | Status   | Date       |
| ------------------------------------------------ | ----------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-record-architecture-decisions.md)    | Record architecture decisions                                           | Accepted | 2026-10-20 |
| [0002](0002-integration-layer-hub-and-spoke.md)  | Hub-and-spoke integration layer around a canonical employee model       | Accepted | 2026-10-20 |
| [0003](0003-pnpm-workspaces-monorepo.md)         | pnpm workspaces monorepo without a task runner                          | Accepted | 2026-10-20 |
| [0004](0004-typescript-6-esm.md)                 | TypeScript 6.0 in strict mode with ESM everywhere                       | Accepted | 2026-10-20 |
| [0005](0005-web-stack.md)                        | React 19 single-page web stack on Vite 8, Tailwind CSS 4 and shadcn/ui  | Accepted | 2026-10-20 |
| [0006](0006-api-nestjs-layered-modules.md)       | NestJS 12 API with layered domain modules                               | Accepted | 2026-10-20 |
| [0007](0007-prisma-postgresql.md)                | Prisma 7.10 on PostgreSQL 18                                            | Accepted | 2026-10-20 |
| [0008](0008-jobs-events-realtime.md)             | BullMQ jobs, in-process domain events and Server-Sent Events            | Accepted | 2026-10-20 |
| [0009](0009-shared-zod-contracts.md)             | Shared zod schemas as the single contract                               | Accepted | 2026-10-20 |
| [0010](0010-auth-sessions-rbac-masking.md)       | Cookie-based JWT sessions, RBAC and field-level masking                 | Accepted | 2026-10-20 |
| [0011](0011-ai-gateway-human-in-the-loop.md)     | LLM gateway with usage tracking and human approval                      | Accepted | 2026-10-20 |
| [0012](0012-testing-strategy.md)                 | Testing strategy with Vitest, Supertest and Playwright                  | Accepted | 2026-10-20 |
| [0013](0013-mock-external-systems.md)            | Mock external systems as separate Express services                      | Accepted | 2026-10-20 |
| [0014](0014-deployment-docker-aws.md)            | Docker images locally and AWS as the cloud target                       | Accepted | 2026-10-20 |
| [0015](0015-i18n-and-fonts.md)                   | Runtime bilingual UI with namespaced translations and self-hosted fonts | Accepted | 2026-10-20 |
| [0016](0016-observability-baseline.md)           | Observability baseline and first-party clickstream analytics            | Accepted | 2026-10-20 |
| [0017](0017-ui-component-registries.md)          | shadcn registries for UI components and React Bits licence handling     | Accepted | 2026-10-20 |
| [0018](0018-web-csp-inline-styles.md)            | Allow inline styles in the web content security policy                  | Accepted | 2026-10-20 |
| [0019](0019-ideas-not-adopted-from-azri-plan.md) | Parts of Azri's integrated plan we did not adopt                        | Accepted | 2026-10-21 |

## Statuses

| Status             | Meaning                                               |
| ------------------ | ----------------------------------------------------- |
| Proposed           | Open for review in a pull request                     |
| Accepted           | Merged; the team builds to it                         |
| Rejected           | Considered and declined; kept for the record          |
| Deprecated         | No longer applies and has no replacement              |
| Superseded by NNNN | Replaced by a later ADR, which links back to this one |

## Adding an ADR

1. Take the next free number from the index above. Numbers are never reused.
2. Create `NNNN-kebab-case-title.md` from the template in [ADR 0001](0001-record-architecture-decisions.md#template).
3. Add a row to this index in the same pull request, and request review from the owner of every area the decision affects ([`../team/module-ownership.md`](../team/module-ownership.md)).
4. The ADR becomes Accepted when the pull request merges.

Decisions made before the first client meeting rest on assumptions about Organisation E's real systems (see [`../assumptions.md`](../assumptions.md) and [`../client/questions-for-client.md`](../client/questions-for-client.md)). Some of them will be superseded once the actual vendors, APIs and data-residency rules are known.
