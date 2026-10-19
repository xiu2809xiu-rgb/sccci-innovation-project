# HuiTong 汇通

HR and administration integration and workflow-automation layer for a financial-services group with a Singapore operation and a China HQ (IT2134 IT Innovation Project, SCCCI x NYP AI Innovation Challenge, Problem Statement #17).

> Work in progress on `feat/platform-base`. The full README (screenshots, demo accounts, architecture) lands at the end of the platform-base build. All data in this repository is synthetic.

## Quick start (Docker)

Requires Docker Desktop with Compose v2.

```bash
docker compose up --build
```

## Quick start (local development)

Requires Node.js 24 LTS (>= 24.15) and pnpm 12.

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
