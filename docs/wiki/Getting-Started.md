# Getting started

## What you need

- **Node.js 24.22** (the version in `.node-version`). Node 24.15 crashed the API integration test workers on Windows.
- **pnpm 12** (`npm install --global pnpm@12.14.0`).
- **Docker Desktop** with Compose v2.
- The **GitHub CLI** (`gh`), signed in, if you run the backlog or wiki scripts.

## Run everything in Docker

```bash
docker compose up --build
```

Open http://localhost:8080 and choose a demo role on the sign-in page. Every account and record is synthetic.

## Develop locally

```bash
pnpm install
docker compose up -d postgres redis   # data services only
pnpm db:migrate && pnpm db:seed
pnpm dev                              # web, API, mocks and shared packages in watch mode
```

The web app runs at http://localhost:5173 and the API at http://localhost:3000 (Swagger at `/api/docs`).

## Before you open a pull request

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

The integration tests need PostgreSQL and Redis from compose. Read [How we work](How-We-Work) for branches, commits and reviews, and [CONTRIBUTING.md](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/CONTRIBUTING.md) for the details.

## The React Bits licence key

Only needed to install React Bits Pro items. The team lead shares it privately; keep it in your own git-ignored `apps/web/.env.local` and never paste it anywhere else. A pre-commit hook refuses any commit that contains it.
