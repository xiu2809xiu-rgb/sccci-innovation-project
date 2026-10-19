# ADR 0003: pnpm workspaces monorepo without a task runner

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4, M5

## Context

HuiTong consists of a web app, an API, three mock external systems and a few shared packages: canonical types and zod schemas, ESLint configuration and TypeScript configuration. Four owners work on it at the same time.

- The web and the API share one contract ([ADR 0009](0009-shared-zod-contracts.md)). A contract change and the code that uses it should land in one pull request.
- The module assesses a team Git workflow with branches and pull requests (M5), and CI must lint, typecheck, test and build everything on every pull request.
- The team develops on Windows laptops. `corepack enable` needs administrator rights there, so pnpm is installed with `npm i -g pnpm`.
- The repository is small: about eight packages.

## Decision

We will use **one Git repository with pnpm 12.14.0 workspaces**. Local machines, CI and Docker images (`node:24` Alpine) all run Node.js 24 LTS (24.15.x).

**Workspace layout.** `pnpm-workspace.yaml` includes `apps/*`, `services/*` and `packages/*`.

| Folder      | Packages                                                         | Purpose                                                                                     |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/`     | `web`, `api`                                                     | The deployable applications                                                                 |
| `services/` | `mock-sg-hr`, `mock-cn-hq`, `mock-oa`                            | Stand-ins for Organisation E's external systems ([ADR 0013](0013-mock-external-systems.md)) |
| `packages/` | `@huitong/shared`, `@huitong/eslint-config`, `@huitong/tsconfig` | Code and configuration shared by apps and services                                          |

**Boundary rules**

- `apps/*` and `services/*` may depend on `packages/*`. Packages never depend on apps or services.
- Apps never import each other: the web reaches the API only over HTTP.
- Internal dependencies use the `workspace:*` protocol. Each package exposes its public API through an `exports` map and one barrel `index.ts`; barrels exist only at package boundaries (`CLAUDE.md` section 6).

**Scripts.** The root `package.json` provides `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `diagrams:build`, `slides:build` and `format`.

- Most of them delegate with `pnpm -r`, which runs a script in every package in topological order, so `@huitong/shared` builds before the apps that import it.
- `pnpm --filter <package>` targets a single package.
- `dev` starts the long-running servers in parallel.

**Dependencies and hygiene**

- Dependencies are pinned to exact versions, with one lockfile (`pnpm-lock.yaml`). CI installs with `--frozen-lockfile` and caches the pnpm store.
- pnpm runs dependency install scripts only for packages on an explicit allow-list in the workspace configuration. Native packages such as `argon2` are approved by name.
- Shared tooling: an ESLint 10 flat config in `@huitong/eslint-config`, a strict base tsconfig in `@huitong/tsconfig`, and Prettier 3.9. Husky 9, lint-staged and commitlint check formatting and Conventional Commits before code reaches a pull request.

## Consequences

### Positive

- One pull request can change a contract and every consumer atomically, and reviewers see the whole change.
- pnpm's strict, symlinked `node_modules` stops a package from importing a dependency it has not declared (no phantom dependencies). Its content-addressable store keeps installs fast and disk use low on student laptops.
- There is no extra build tool to learn or explain; build order comes from the declared dependencies.
- The install-script allow-list narrows one common supply-chain attack route.

### Negative

- There is no task caching: `pnpm -r build` rebuilds every package each time. That is acceptable for eight packages. Revisit if a full CI run regularly takes longer than 10 minutes.
- Everyone can see every area's code. Ownership is enforced by CODEOWNERS and review, not by access control.
- A change to shared configuration affects every package, so changes to `packages/*` need area 1 review.
- pnpm's strictness occasionally breaks a tool that assumes a flat `node_modules`. We fix that by declaring the missing dependency, not by hoisting everything.

## Alternatives considered

| Option                                       | Why rejected                                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Polyrepo (one repository per app or service) | Contracts drift between repositories, a contract change needs coordinated pull requests and releases, and assessors have to review several repositories                                                   |
| npm or Yarn classic workspaces               | Flat hoisting allows phantom dependencies, and package filtering is weaker                                                                                                                                |
| Yarn Berry with Plug'n'Play                  | Strict and fast, but Plug'n'Play still trips tools and native modules that expect `node_modules`, which adds friction for a student team                                                                  |
| Turborepo or Nx on top of pnpm               | Task caching and affected-only builds pay off in large repositories. Here they add a configuration layer and another tool to explain, for little gain. Turborepo can be added later without restructuring |
| Bun workspaces                               | Fast, but the runtime target is Node.js LTS, and using different runtimes in development and production adds risk                                                                                         |

## Dependency policy

The rules behind "Dependencies and hygiene" above, as configured in `pnpm-workspace.yaml`:

| Rule                      | Setting                               | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact pins                | `savePrefix: ''`                      | `pnpm add` records exact versions, never `^` or `~` ranges. Ranges that arrive another way, such as dependencies declared by shadcn registry items, are re-pinned after install ([ADR 0017](0017-ui-component-registries.md))                                                                                                                                                                                                                              |
| One-day release age       | `minimumReleaseAge: 1440` (minutes)   | pnpm refuses versions published less than a day ago. That gives the ecosystem time to catch and pull a compromised release before it can reach our lockfile                                                                                                                                                                                                                                                                                                |
| Reviewed build scripts    | `allowBuilds`                         | Dependency install scripts are denied unless listed, and pnpm fails the install on an unreviewed one. Each entry is checked (publisher, what the script does, whether a prebuilt binary exists) and carries a comment saying why. Today only `esbuild` is approved: its script verifies and links the platform binary that `tsx` uses. `argon2` will go through the same review when authentication lands ([ADR 0010](0010-auth-sessions-rbac-masking.md)) |
| Documented peer overrides | `peerDependencyRules.allowedVersions` | `eslint-plugin-jsx-a11y` 6.10.2 declares ESLint peers only up to version 9. Its rules were checked on ESLint 10 with probe files containing known violations, and they reported them correctly, so `eslint-plugin-jsx-a11y>eslint: '10'` allows the newer peer instead of downgrading ESLint. The override is removed once the plugin declares ESLint 10 support                                                                                           |

**Release-age holds.** When the newest release of a package is under a day old, we pin the newest release that is not. On 20 October 2026 that meant:

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` and `@nestjs/testing` at 12.1.3, not 12.2;
- `react-router` 8.4.0, `@tanstack/react-query` 5.104.4, `@hookform/resolvers` 5.9.2, `motion` 14.3.0 and `bullmq` 6.3.16;
- `@commitlint/cli` and `@commitlint/config-conventional` at 21.2.3.

`npm view <package> time` shows when each version was published. A held package moves to the newer release in a later PR, once it has matured and the checks pass.

Any new override or approved build script is explained in a comment in `pnpm-workspace.yaml` and in the pull request that adds it.
