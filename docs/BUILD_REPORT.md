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
- [ ] pnpm workspace, shared tsconfig, ESLint flat config, Prettier
- [ ] Husky + lint-staged + commitlint; root scripts
- [ ] CI workflow, PR/issue templates, CODEOWNERS
- [ ] Dockerfiles (api, web/nginx, mocks) + docker-compose with healthchecks
- [ ] shadcn/ui init in `apps/web`, registries, licence key moved, test installs per source
- [ ] React Bits skill at `.claude/skills/reactbits/SKILL.md`; shadcn MCP for Claude Code

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

## Manual steps for the owner

None of these block the build; they improve the local setup.

1. **Blender on PATH (optional).** Blender 5.2.1 LTS is installed at `C:\Program Files\Blender Foundation\Blender 5.2\`. The asset scripts call it by full path, so nothing is required. To run `blender` directly, add that folder to your user `Path` environment variable.
2. **corepack (optional).** `corepack enable` fails without admin rights because it writes shims into `C:\Program Files\nodejs`. pnpm was installed with `npm i -g pnpm` instead, which needs no admin rights.
3. **Docker Desktop.** It was started from the terminal for this build. Enable "Start Docker Desktop when you sign in" in Docker Desktop settings if you want it running by default.
