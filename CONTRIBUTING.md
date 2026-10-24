# Contributing to HuiTong 汇通

Read [CLAUDE.md](CLAUDE.md) first: it sets the context, the stack and the standards. This guide covers the mechanics of contributing; the team's process is in [docs/agile/](docs/agile/README.md).

## Set up

- Node.js 24.22 (`.node-version`), pnpm 12, Docker Desktop with Compose v2.
- `pnpm install`, then `docker compose up -d postgres redis`, `pnpm db:migrate`, `pnpm db:seed` and `pnpm dev`.
- Everything in containers instead: `docker compose up --build`, then open http://localhost:8080.

## One task, one branch, one pull request

1. Take a story from the current sprint on the **HuiTong delivery** board and assign yourself.
2. Branch from an up-to-date `main`:

   | Prefix   | For                           | Example                          |
   | -------- | ----------------------------- | -------------------------------- |
   | `feat/`  | A feature, named by area      | `feat/area2-requisition-from-oa` |
   | `fix/`   | A bug fix                     | `fix/leave-overlap-validation`   |
   | `docs/`  | Documentation only            | `docs/area3-guide`               |
   | `test/`  | Tests only                    | `test/e2e-consolidation`         |
   | `ci/`    | Workflows and checks          | `ci/zap-baseline`                |
   | `chore/` | Tooling, dependencies, upkeep | `chore/node-24-22`               |

3. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat(area2): open a requisition when OA approves a manpower request`). commitlint refuses anything else, and the pre-commit hook lints, formats, and refuses the React Bits licence key and the client's sample exports (anything in `samples/` but its README); the pre-push hook checks the commits you push for those samples too.
4. Push and open a pull request to `main`. Fill in the template: `Closes #<story>`, the acceptance criteria with evidence, how you verified it, and screenshots for UI changes.
5. All checks must pass: CI (lint, typecheck, unit and integration tests, build, Docker build and image scan), CodeQL, dependency review and the configuration scan.
6. The code owner of the touched folders reviews; the team lead reviews shared files.
7. Merge with a **merge commit** and delete the branch. Never push to `main` directly: the ruleset refuses it.

## Before you push

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The integration tests need PostgreSQL and Redis (`docker compose up -d postgres redis`). The [Definition of Done](docs/agile/definition-of-ready-and-done.md#definition-of-done) lists everything a story needs, and the [test plan](docs/agile/test-plan.md) says which tests belong where.

## Code standards in short

- TypeScript strict, no `any`; validate external input with the shared zod schemas.
- Back end: thin controllers, services for use cases, repositories as the only place Prisma is called.
- Front end: function components and hooks; every data view handles loading, empty, error, partial, success and permission-denied; no hard-coded strings (add EN and 中文).
- Comments explain why, not what. No `console.log`, dead code or commented-out code.

## Adding a connector

Implement `SystemConnector` in `apps/api/src/modules/connectors/adapters/`, register its type in `connector-factory.ts`, keep credentials in the typed config (never in the database), and add a baseline mapping and its tests. A new subsidiary that only exports files needs no adapter: its mapping comes from a sample file through the AI mapping wizard, and HR approves it before use. HR then stages the whole export on the connector's page, and a sync imports it through that mapping (story A-5).

## Adding a React Bits item

Read `.claude/skills/reactbits/SKILL.md`, install the TypeScript and Tailwind variant with the shadcn CLI from `apps/web`, adapt it to the design tokens with a header comment that states its origin, and record it in `docs/design/reactbits-usage.md`. Delete anything you install but do not use.

## Security and data

Synthetic data only, and never a national ID number. Report vulnerabilities privately ([SECURITY.md](SECURITY.md)). Log significant AI-assisted work in `docs/ai/ai-usage-log.md`; commits, pull requests and code carry no AI attribution.
