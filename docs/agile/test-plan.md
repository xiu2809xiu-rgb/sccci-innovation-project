# Test plan

What we test, how, where and when, so that every acceptance criterion has a test behind it and every assessment shows real evidence. The tooling decisions are in [ADR 0012](../adr/0012-testing-strategy.md); security testing is detailed in [security-testing.md](../security/security-testing.md).

## Objectives

- Prove each story's acceptance criteria with an automated test wherever a machine can check them.
- Keep the domain logic (mapping, transformers, conflict detection, masking, the workflow state machine, leave mapping) at 80% line coverage or more.
- Catch security and accessibility problems before they reach `main`.
- Keep the demo runnable from `docker compose up --build` at the end of every sprint.

## Test levels

| Level              | What it proves                                                                                 | Tool                                | Location                                                 | Owner                                      | Runs                             |
| ------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------- | ------------------------------------------ | -------------------------------- |
| Unit               | Domain rules in isolation: transformers, merge rules, masking, state machines, validators      | Vitest                              | `*.spec.ts` beside the code; `*.test.tsx` in the web app | Each area                                  | Every commit (CI)                |
| API integration    | Each endpoint with real PostgreSQL and Redis: the happy path, 401, 403 and validation failures | Vitest + Supertest                  | `apps/api/test/*.int-spec.ts`                            | Each area                                  | Every PR (CI)                    |
| Connector contract | Adapters against the mock systems' real HTTP behaviour (paging, auth, formats)                 | Vitest, mocks started in-process    | `apps/api/test/`, beside each adapter                    | Area 1                                     | Every PR (CI)                    |
| Mock services      | Each mock system's schema and behaviour                                                        | Vitest + Supertest                  | `services/mock-*/src/*.spec.ts`                          | Area 1                                     | Every PR (CI)                    |
| Component          | UI states, keyboard paths and translations of screens and React Bits items                     | Vitest + Testing Library (jsdom)    | `apps/web/src/**/*.test.tsx`                             | Each area                                  | Every PR (CI)                    |
| End to end         | The user journeys through the real stack, with axe accessibility checks on every page          | Playwright + `@axe-core/playwright` | `apps/web/e2e/`                                          | Area 1; area 3 adds the consolidation step | Every PR (CI)                    |
| Performance        | The bundle budget (initial JS 250 KB gzip or less) and Lighthouse scores of 90 or more         | Bundle check script, Lighthouse     | `apps/web/scripts/`                                      | Area 1                                     | Every PR; Lighthouse at releases |
| Security           | SAST, dependency review, image and configuration scans, secret scanning; DAST once deployed    | CodeQL, Trivy, Dependabot, ZAP      | `.github/workflows/`                                     | Area 4 (with 1)                            | Every PR and weekly              |
| Usability          | Real HR users complete the journeys on the prototype and the build                             | Moderated sessions with the client  | `docs/design-thinking/`                                  | Whole team                                 | W4 prototype, W13, W18           |

## Environments and data

- **Local:** `docker compose up --build`, or PostgreSQL and Redis from compose with `pnpm dev`. Use Node 24.22 (`.node-version`); on Windows, Node 24.15 crashed the API integration test workers intermittently.
- **CI:** GitHub Actions on Ubuntu with PostgreSQL 18 and Redis 8 service containers and an isolated `huitong_test` database that each run migrates and seeds.
- **AWS demo:** from sprint 17, the target of the DAST scan and of release smoke tests.
- **Data:** only the seeded synthetic dataset (120 employees across SG01 and CN01, with deliberate drift between systems) and generated files such as the Malaysia sample. The `mock` LLM provider makes AI results deterministic.

## Traceability

Each acceptance criterion maps to a test. The pull request that closes a story lists the criteria with the test that proves each one, and the traceability matrix records the evidence ([requirements-traceability.md](../requirements-traceability.md)). A criterion that only a person can check (a usability finding, a visual quality judgement) names who checked it and links the screenshot.

## Entry and exit criteria

| Stage               | Entry                                                                                | Exit                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| A story in a sprint | Meets the [Definition of Ready](definition-of-ready-and-done.md#definition-of-ready) | Every criterion proven; the [Definition of Done](definition-of-ready-and-done.md#definition-of-done) met |
| Merge into `main`   | A pull request with the template filled in                                           | All checks green; findings triaged; reviewed                                                             |
| Assessment release  | Feature freeze in the sprint before                                                  | Full suite green on `main`, Lighthouse 90 or more, no open S1 or S2 bug, the release tagged              |

## Schedule

| Sprints   | Testing focus                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| 1         | Baseline: unit, integration, component and security scanning in CI for the platform base and area 1           |
| 2 to 4    | Usability walk-through of the prototype with the client; e2e smoke test of the area 1 journey                 |
| 5 to 7    | Test skeletons for areas 2 to 4; each owner explains their tests at the mock interview                        |
| 8 to 12   | Coverage gates on each new domain module; integration tests for every new endpoint; e2e steps per journey     |
| 13        | Evidence pack for the technical review: CI history, coverage, security results                                |
| 14 to 16  | Tests for tracing, metrics, analytics consent and AI cost accounting                                          |
| 17        | DAST against the deployed demo; Lighthouse on the main pages; a load check of the sync and consolidation jobs |
| 18 and 19 | Release smoke test, rehearsal, and handover                                                                   |

## Defects

- Bugs are reported with the **Bug report** form: severity S1 (blocks a demo or loses data) to S4 (cosmetic), steps, expected behaviour and the `traceId` from the error panel.
- S1 is fixed the same day and S2 within the sprint. S3 and S4 are planned at refinement.
- Every fixed bug gets a regression test at the lowest level that reproduces it.
- Security findings follow the [triage rules](../security/security-testing.md#triage), never the public bug form.

## Risks to testing

| Risk                                           | Mitigation                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Flaky tests from timing or shared state        | Fake timers for SLAs, isolated test data per file, serial database specs          |
| Mocks drift from Organisation E's real systems | Contract tests re-recorded from client samples once they are available (GRS R-16) |
| Environment differences (Windows and Linux)    | CI on Linux is the reference; the Node version is pinned                          |
| Accessibility gaps that axe cannot detect      | Keyboard paths scripted in e2e; manual screen-reader checks on the PR checklist   |
