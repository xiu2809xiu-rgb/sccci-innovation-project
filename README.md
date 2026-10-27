# OrderPilot

AI-assisted order automation beside Navision for Spectra Innovations, a Singapore distributor of IT products and computer peripherals: customer and vendor documents read once, checked against each other, routed for approval across six teams, and followed on one order tracker, with human approvals and financial controls kept in place (IT2134 IT Innovation Project, SCCCI x NYP AI Innovation Challenge, Problem Statement #11).

**AI reads, rules decide, people approve.**

> The project is being retargeted from earlier statements pull request by pull request ([ADR 0024](docs/adr/0024-final-statement-11-spectra.md)), so until that work reaches them, the mock systems, the seed data and some screens still show an earlier statement's HR domain. All data in this repository is synthetic.

## Quick start (Docker)

Requires Docker Desktop with Compose v2.

```bash
docker compose up --build
```

## Quick start (local development)

Requires Node.js 24 LTS (24.22 or newer, the version in `.node-version`) and pnpm 12. On Windows, 24.15 crashed intermittently while running the API integration tests.

```bash
pnpm install
docker compose up -d postgres redis   # data services only
pnpm dev                              # web, api, mocks and shared in watch mode
```

## Ports

| Service                   | URL                   | Notes                                                                                |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| Web app (Docker, nginx)   | http://localhost:8080 | Serves the built SPA and proxies `/api/` to the API                                  |
| Web app (local dev, Vite) | http://localhost:5173 | Proxies `/api` and `/health` to the API                                              |
| API                       | http://localhost:3000 | REST under `/api/v1`, Swagger at `/api/docs`, health at `/health` and `/health/live` |
| Mock Singapore HR         | http://localhost:4101 | English keys, ISO dates                                                              |
| Mock China HQ (SAP-like)  | http://localhost:4102 | Chinese keys, `YYYY/MM/DD` dates, SAP-style codes                                    |
| Mock OA approvals         | http://localhost:4103 | Approval workflows and HMAC-signed webhooks                                          |
| PostgreSQL                | localhost:5432        | Database `huitong`                                                                   |
| Redis                     | localhost:6379        | BullMQ job queues                                                                    |

Override host ports for PostgreSQL and Redis with `POSTGRES_PORT` and `REDIS_PORT` in a root `.env` (see `.env.example`).

The three mock systems above belong to an earlier statement. They are being replaced by `mock-navision`, an OData-style stand-in for Spectra's Navision ERP, and `mock-mailbox`, inbound emails with attachments and a signed "new mail" webhook, which stand in for the client's real systems until the client's samples arrive. The app shows a "Mock" badge on every connector they back, and a "Mock AI" badge on output from the default `mock` AI provider. To demonstrate a real model, see [switching the AI provider](docs/team/area-1-integration-core.md#switching-the-ai-provider-for-a-demo).

## Scripts

| Script                             | What it does                                |
| ---------------------------------- | ------------------------------------------- |
| `pnpm dev`                         | Runs every package in watch mode            |
| `pnpm build`                       | Builds every package in dependency order    |
| `pnpm lint`                        | ESLint (type-aware) across the monorepo     |
| `pnpm typecheck`                   | TypeScript checks for every package         |
| `pnpm test`                        | Unit and integration tests (Vitest)         |
| `pnpm test:e2e`                    | Playwright end-to-end smoke test            |
| `pnpm db:migrate` / `pnpm db:seed` | Prisma migrations and synthetic seed data   |
| `pnpm diagrams:build`              | Renders `docs/diagrams/*.mmd` to SVG        |
| `pnpm slides:build`                | Exports the Marp deck to PDF, HTML and PPTX |
| `pnpm format`                      | Prettier                                    |

## Documentation

Start with [`CLAUDE.md`](CLAUDE.md) (project context and standards), [`docs/problem-statement.md`](docs/problem-statement.md) and [`docs/team/module-ownership.md`](docs/team/module-ownership.md).

## How we work

One-week sprints, one task per branch, and a pull request for every change. [`CONTRIBUTING.md`](CONTRIBUTING.md) covers the mechanics, [`docs/agile/`](docs/agile/README.md) the working agreement, the Definition of Done, the backlog and the test plan, and [`SECURITY.md`](SECURITY.md) how to report a vulnerability and what the security checks cover.
