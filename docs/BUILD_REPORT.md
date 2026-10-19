# Build report: platform base (prompt 001)

Status of the platform-base build on branch `feat/platform-base`. The checklist below is kept current as each phase lands; the sections after it summarise verification evidence.

## Phase checklist

Legend: `[x]` done and verified, `[~]` in progress, `[ ]` not started, `[!]` blocked (see notes).

### Phase 0: Environment check

- [x] `.gitignore` covers `.env`, `.env.local`, `.env.*.local` (and `.env.*`); `.env.example` stays tracked
- [x] Tools: Node 24.15.0 LTS, pnpm 12.14.0 (installed with `npm i -g pnpm`; `corepack enable` needs admin), Git 2.53, Docker 29.6.1 + Compose 5.3.0 (Desktop started from the terminal), Blender 5.2.1 LTS (full path, not on PATH)
- [x] Manual steps listed for the owner (none blocking)

### Phase 1: Understand and document

- [ ] `docs/problem-statement.md` (verbatim statement + structured analysis + success metrics)
- [ ] `docs/design-thinking/` (personas, journey maps, HMW, hypotheses)
- [ ] `docs/grs/grs-by-design.md` (governance, risk register, sustainability)
- [ ] `docs/client/questions-for-client.md`
- [ ] `docs/team/module-ownership.md`
- [ ] `docs/assumptions.md`, `docs/requirements-traceability.md`
- [ ] `docs/adr/0001` + one ADR per major stack choice

### Phase 2: Monorepo, tooling, CI, Docker, UI kit

- [x] pnpm workspace (9 projects), shared tsconfig (`@huitong/tsconfig`), ESLint 10 flat config (`@huitong/eslint-config`, type-aware strict + jsx-a11y strict), Prettier
- [x] Husky + lint-staged + commitlint (bad message rejected, conventional message accepted); root scripts
- [x] CI workflow (install, audit, format, lint, typecheck, tests with Postgres + Redis services, build, docker build; actions pinned to commit SHAs), PR/issue templates, CODEOWNERS placeholder
- [x] Dockerfiles (api, web/nginx, mocks; multi-stage, non-root, healthchecks) + docker-compose with healthchecks and `depends_on` health conditions
- [x] shadcn/ui init in `apps/web` (Vite, Radix base, `radix-nova` style), registries added, licence key moved, test install per source passed
- [x] React Bits skill at `.claude/skills/reactbits/SKILL.md` (read in full); shadcn MCP for Claude Code in `.mcp.json` (handshake verified; takes effect next session)
- [~] `docker compose up --build` acceptance: the whole stack builds and every container reports healthy; seeded data arrives with Phase 3

### Phase 3: Backend foundation, mocks and data

- [ ] NestJS: typed config, Prisma, validation, exception filter, logging + correlation ids, `/health`, Swagger
- [ ] Auth: seeded demo users (all roles), RBAC guard, field-masking interceptor, append-only audit writer
- [ ] BullMQ queue infrastructure; `LlmGateway` + `AiUsageTracker` (mock default, Bedrock optional)
- [ ] Prisma schema for all areas + migrations + seed
- [ ] Mock services (SG HR, CN HQ, OA with HMAC webhooks) + synthetic data
- [ ] Web `ApiClient`, `AnalyticsTracker`; clickstream ingestion endpoint

### Phase 4: Design system and app shell

- [ ] React Bits skill + catalogues read; `docs/design/reactbits-usage.md` plan; `docs/design/design-system.md`
- [ ] Tokens, themes, i18n, layouts, shared composites
- [ ] App shell (sidebar, breadcrumbs, command palette, language/theme toggles, role switcher, notifications)
- [ ] Landing/login with Pro blocks + 3D teaser; Overview page

### Phase 5: Area 1 Integration Core

- [ ] Connectors (Adapter + Factory) for SG HR and CN HQ; sync job (Template Method) on BullMQ
- [ ] Mapping engine (Strategy transformers); canonical master with provenance; conflict detection + audited resolution
- [ ] AI schema-mapping assistant with approval and versioned configs
- [ ] Employees page; Connectors page + AI mapping wizard
- [ ] Unit, integration and e2e tests; `docs/team/area-1-integration-core.md`

### Phase 6: Head starts for areas 2-4

- [ ] Area 2 workflows: contracts, UI, test skeletons, guide
- [ ] Area 3 attendance/leave/reporting: contracts, UI, test skeletons, guide
- [ ] Area 4 governance/security/monitoring: contracts, UI, test skeletons, guide
- [ ] Playwright screenshots of every page in both themes

### Phase 7: 3D integration map

- [ ] Blender scripts -> GLB -> gltf-transform (<= 1.5 MB)
- [ ] R3F scene with postprocessing, live status, interaction, accessibility fallbacks

### Phase 8: Diagrams

- [ ] Mermaid sources + SVGs; `docs/architecture/README.md`; `docs/architecture/patterns.md`

### Phase 9: Slides

- [ ] Marp deck + theme; PDF/HTML/PPTX export

### Phase 10: Hardening and handover

- [ ] Security checklist + dependency audit; axe pass; Lighthouse; secrets and attribution sweeps
- [ ] README, CONTRIBUTING, final build report; clean-state verification

## Verification log

### Phase 2 (20 Oct 2026)

| Check                           | Result                                                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                  | Clean; lockfile passes the supply-chain policy (one-day `minimumReleaseAge`, reviewed `allowBuilds`)                                                                                                                                                                                                |
| `pnpm lint`                     | 0 problems. Probe files confirmed the rules fire: `no-explicit-any`, `no-console`, `no-floating-promises`, `require-await` and three `jsx-a11y` rules                                                                                                                                               |
| `pnpm typecheck`                | 6 projects pass                                                                                                                                                                                                                                                                                     |
| `pnpm test`                     | 6 test files, 9 tests pass (including a NestJS integration test, which proves dependency injection works under Vitest 5 without SWC)                                                                                                                                                                |
| `pnpm build`                    | All packages build; web initial JS 68.7 KB gzip                                                                                                                                                                                                                                                     |
| `pnpm audit --audit-level high` | Passes with one documented exception (GHSA-vfj7-8cjw-p6xm, dev-only path through the shadcn CLI, no patched version; see `pnpm-workspace.yaml`)                                                                                                                                                     |
| Built API under Node            | `node apps/api/dist/main.js` boots; `/health` and `/health/live` return `status: ok`                                                                                                                                                                                                                |
| `docker compose build`          | 5 images built                                                                                                                                                                                                                                                                                      |
| `docker compose up`             | postgres, redis, 3 mocks, api and web all `healthy`; api and mocks run as uid 1000, nginx as uid 101                                                                                                                                                                                                |
| nginx                           | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, HSTS on every response; SPA deep links return `index.html`; hashed assets cached 1 year (`immutable`) and gzip-encoded; `/api/` proxied to the API                                                           |
| shadcn registries               | Test installs passed for `@reactbits-starter/globe-tw` (Pro component), `@react-bits/SplitText-TS-TW` (free), `@magicui/animated-shiny-text` (Magic UI) and `@reactbits-pro/hero-33` (Pro block); test files then deleted. Catalogue sizes: 619 Pro, 463 Starter, 1,274 free variants, 250 Magic UI |
| Licence key                     | Present only in the git-ignored root and `apps/web` `.env.local` files (byte-for-byte scan; value never printed)                                                                                                                                                                                    |

Notes:

- **TypeScript 6.0.3, not 7.0.2.** TypeScript 7 is the native Go port; its JS API is still `unstable/*`, typescript-eslint 8.71 requires TS < 6.1, and `@nestjs/cli` 12 depends on TS ~6.0.
- **Maturity pins.** pnpm refuses versions published less than a day ago, so several packages are pinned one release back (for example NestJS 12.1.3 instead of 12.2.0, published the day before).
- **shadcn init added `cn`.** It is shadcn's own compiled replacement for `clsx` + `tailwind-merge` (repository `shadcn-ui/cn`), not a typosquat; checked before use.
- **Free React Bits items can declare caret ranges** (SplitText pulled `gsap@^3.15.0`). Items are re-pinned exactly when installed for real in Phase 4.

## Manual steps for the owner

None of these block the build; they improve the local setup.

1. **Blender on PATH (optional).** Blender 5.2.1 LTS is installed at `C:\Program Files\Blender Foundation\Blender 5.2\`. The asset scripts call it by full path, so nothing is required. To run `blender` directly, add that folder to your user `Path` environment variable.
2. **corepack (optional).** `corepack enable` fails without admin rights because it writes shims into `C:\Program Files\nodejs`. pnpm was installed with `npm i -g pnpm` instead, which needs no admin rights.
3. **Docker Desktop.** It was started from the terminal for this build. Enable "Start Docker Desktop when you sign in" in Docker Desktop settings if you want it running by default.
4. **shadcn MCP server.** `.mcp.json` registers the shadcn MCP server (pointed at `apps/web`). It loads in the next Claude Code session; approve the `shadcn` server when prompted. If it fails to start on native Windows, register it locally with `claude mcp add shadcn -- cmd /c npx -y shadcn@4.22.0 mcp --cwd apps/web`.
5. **CODEOWNERS.** Replace the placeholder handles in `.github/CODEOWNERS` with real GitHub usernames once areas 2-4 are assigned, then uncomment the rules.
