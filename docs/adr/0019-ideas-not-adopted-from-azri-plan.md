# ADR 0019: Parts of Azri's integrated plan we did not adopt

- **Status:** Accepted
- **Date:** 2026-10-21
- **Traceability:** M5 (team workflow and decisions) · M6 (deploy and monitor) · capabilities A to G

## Context

Azri wrote a separate plan for Problem Statement #17 ("Full Integrated Agile Implementation Plan", v3). The team compared it with this repository. Most of its ideas made our plan better, and prompt 002 ([`../ai/prompts/002-adopt-azri-plan.md`](../ai/prompts/002-adopt-azri-plan.md)) folds them in, credited to Azri:

- one hero journey across all four areas, with three end-to-end scenarios ([hero-journey.md](../agile/hero-journey.md))
- the draft-to-active employee lifecycle
- possible versus confirmed identity matches
- a per-destination field allowlist that denies by default
- tests for Chinese file encodings
- honest "Mock" labels
- three sample packs to request from the client first
- a failure and edge-case test matrix
- a measurement protocol
- backup owners and demo-reliability work

Three parts of the plan conflict with decisions already made and built.

## Decision

We will keep the stack, the ownership split and the 19-sprint calendar we have, and not adopt these three parts:

| From Azri's plan            | Why not                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Python FastAPI backend    | The NestJS and TypeScript base ([ADR 0006](0006-api-nestjs-layered-modules.md)) is built and tested. Node covers the same needs: its built-in `TextDecoder` (or iconv-lite) reads GBK and GB18030, `read-excel-file` already reads spreadsheets, and a writer such as ExcelJS can produce .xlsx files. One language end to end lets the web app and the API share their types ([ADR 0009](0009-shared-zod-contracts.md)). |
| Its ownership split         | It gives no member the module's "Deploy and monitor" requirement (observability, clickstream analytics and AI token tracking). Our four areas cover all six module requirements, and area 4 owns M6 ([module-ownership.md](../team/module-ownership.md)).                                                                                                                                                                 |
| Its generic 12-week roadmap | It does not follow the NYP calendar: the W5 proposal, the W7 mock interview, the W13 technical review, the W14 to W16 monitoring topics and the term break. Our backlog's 19 one-week sprints do ([backlog.md](../agile/backlog.md#sprints)).                                                                                                                                                                             |

## Consequences

### Positive

- The adopted ideas land in a codebase that already runs, so none of the built work is thrown away.
- Every module requirement keeps a named owner, and the plan keeps matching the assessment calendar.

### Negative

- Azri's plan and this repository now differ in places. This record, and the credits in the adopted documents, show which parts were taken and why the others were not.
- Members who know Python better than TypeScript face a steeper start. Pairing and the implementation guides in `docs/team/` reduce that.

## Alternatives considered

| Option                                    | Why rejected                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Adopt the whole plan, including FastAPI   | It would mean rewriting a tested API and splitting the shared contracts across two languages, in week 1 |
| Adopt nothing and keep our plan as it was | It would lose the ideas that make the demo and the controls stronger, listed under Context              |
