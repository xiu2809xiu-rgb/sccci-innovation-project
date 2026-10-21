# Build report

Status of the platform-base build ([prompt 001](ai/prompts/001-platform-base.md)) and of the ideas adopted from Azri's integrated plan ([prompt 002](ai/prompts/002-adopt-azri-plan.md)). Each task reaches `main` through its own pull request. The checklists are kept current as work lands; the sections after them summarise the verification evidence.

## Phase checklist

Legend: `[x]` done and verified, `[~]` in progress, `[ ]` not started, `[!]` blocked (see notes).

### Phase 0: Environment check

- [x] `.gitignore` covers `.env`, `.env.local`, `.env.*.local` (and `.env.*`); `.env.example` stays tracked
- [x] Tools: Node 24.15.0 LTS, pnpm 12.14.0 (installed with `npm i -g pnpm`; `corepack enable` needs admin), Git 2.53, Docker 29.6.1 + Compose 5.3.0 (Desktop started from the terminal), Blender 5.2.1 LTS (full path, not on PATH)
- [x] Manual steps listed for the owner (none blocking)

### Phase 1: Understand and document

- [x] `docs/problem-statement.md` (verbatim statement, checked paragraph by paragraph against the prompt; stakeholders, pain points, root cause, constraints, scope, success metrics)
- [x] `docs/design-thinking/` (README, personas, journey maps with pain points PP-01 to PP-14, 14 HMW statements, hypotheses PH/SH with prioritisation, success metrics SM-01 to SM-09 and guardrails GR-01 to GR-09)
- [x] `docs/grs/grs-by-design.md` (governance, risk register R-01 onwards with heat maps, sustainability, PDPA/PIPL/MAS considerations)
- [x] `docs/client/questions-for-client.md` (56 prioritised questions, Q-01 to Q-56; Q-57 added in Phase 6)
- [x] `docs/team/module-ownership.md`
- [x] `docs/assumptions.md` (A-01 to A-57), `docs/requirements-traceability.md`
- [x] `docs/adr/0001` to `0017` + index; every relative link and anchor across 33 docs resolves

### Phase 2: Monorepo, tooling, CI, Docker, UI kit

- [x] pnpm workspace (9 projects), shared tsconfig (`@huitong/tsconfig`), ESLint 10 flat config (`@huitong/eslint-config`, type-aware strict + jsx-a11y strict), Prettier
- [x] Husky + lint-staged + commitlint (bad message rejected, conventional message accepted); root scripts
- [x] CI workflow (install, audit, format, lint, typecheck, tests with Postgres + Redis services, build, docker build; actions pinned to commit SHAs), PR/issue templates, CODEOWNERS placeholder
- [x] Dockerfiles (api, web/nginx, mocks; multi-stage, non-root, healthchecks) + docker-compose with healthchecks and `depends_on` health conditions
- [x] shadcn/ui init in `apps/web` (Vite, Radix base, `radix-nova` style), registries added, licence key moved, test install per source passed
- [x] React Bits skill at `.claude/skills/reactbits/SKILL.md` (read in full); shadcn MCP for Claude Code in `.mcp.json` (handshake verified; takes effect next session)
- [x] `docker compose up --build` acceptance: the whole stack builds and every container reports healthy; seeded data arrived with Phase 3

### Phase 3: Backend foundation, mocks and data

- [x] NestJS 12 (ESM): typed, validated config (`AppConfig`, `APP_ENV=production` safety rules), Prisma 7 with the pg adapter, zod validation via `StandardSchemaValidationPipe`, one error envelope with trace ids, pino logs with `X-Request-Id` correlation, `/health` (database + Redis) and `/health/live`, Swagger at `/api/docs`, helmet strict CSP, CORS allow-list, rate limiting, URI versioning
- [x] Auth: seven seeded demo users (argon2id); JWT access cookie; refresh rotation with reuse detection (family revoked, audited); CSRF double-submit; demo login only when `DEMO_MODE=true` (route absent otherwise); permission-based RBAC guard backed by a DB matrix; field-masking interceptor (fails closed); append-only, hash-chained audit writer (database trigger blocks UPDATE, DELETE, TRUNCATE)
- [x] BullMQ queues shared by all areas (`sync`, `workflow`, `notifications`, `consolidation`); `LlmGateway` (mock default, Bedrock Converse, optional OpenAI) with `AiUsageTracker` recording every call including failures; SSE stream at `/api/v1/events`; domain events via the event emitter
- [x] Prisma schema for all four areas (35 models), two migrations, idempotent seed (reference data, access policy, users, connectors, governance, workflow definition, leave rules, report template)
- [x] `@huitong/synthetic-data` (deterministic 120-person workforce, 8 drift stories, attendance, leave, 25 OA requests) and three mock systems with deliberately different vendor schemas; OA webhooks HMAC-signed with retries; [`docs/api/mock-systems.md`](api/mock-systems.md)
- [x] Web `ApiClient` (CSRF, single-flight refresh, contract validation, typed errors) and `AnalyticsTracker` (batching, route patterns, consent and GPC, personal-data stripping); public clickstream ingestion endpoint (role only, GPC honoured)
- [x] `docker compose up --build` from empty volumes: migrations and seed run on start, all seven services healthy

### Phase 4: Design system and app shell

- [x] React Bits skill read in full and catalogues reviewed; [`docs/design/reactbits-usage.md`](design/reactbits-usage.md) (13 items in use with their reduced-motion behaviour, 8 more planned, Pro blocks queued) and [`docs/design/design-system.md`](design/design-system.md)
- [x] OKLCH tokens for light and dark themes (70 contrast checks in `tokens.test.ts`), a seven-size type scale, self-hosted Geist and Noto Sans SC, typed i18n in 12 namespaces with a parity test, layouts and shared composites (`PageHeader`, `SectionCard`, `QueryView`, `DataTable`, empty, error and permission states, status, classification, masking and synthetic-data badges)
- [x] App shell: sidebar filtered by permission, breadcrumbs, ⌘K command palette, EN/中文 and theme menus, demo role switcher (shown only in demo mode, via `GET /api/v1/auth/options`), notifications with live updates over SSE, user menu, skip link
- [x] Landing and sign-in page with a lazy React Three Fiber teaser of the integration map and five React Bits items; Overview page backed by a role-aware `GET /api/v1/overview`; Settings and 404 pages
- [x] React Bits Pro block `auth-4` frames the sign-in page, with the 3D teaser at the centre of its orbital ring. It was added in a follow-up commit, because the registry proxy reset the TLS handshake throughout the phase. `hero-33` was evaluated and not used ([reasons](design/reactbits-usage.md#evaluated-and-removed))

### Phase 5: Area 1 Integration Core

- [x] Connectors (Adapter + Factory) for SG HR and CN HQ, and OA webhooks verified by HMAC with an outbox; the sync job (Template Method) on BullMQ with retries, idempotency keys, a server-side rule that an apply follows a recent preview, and recovery of runs that lost their job
- [x] Mapping engine of twelve Strategy transformers with versioned mappings; the canonical master with per-field provenance and source-of-truth policies; conflict detection and audited resolution; the AI discrepancy explainer
- [x] AI schema-mapping assistant: a sample CSV or Excel file with Chinese headers, national ID columns withheld, approval only with `mappings:approve`, a new mapping version on approval, every call recorded
- [x] Employees page; connector list and detail pages; the Run sync dialog (preview, then apply); the AI mapping wizard; five more React Bits items
- [x] Unit, integration and Playwright e2e tests with axe, and a CI job for them; [`docs/team/area-1-integration-core.md`](team/area-1-integration-core.md) and [`docs/architecture/patterns.md`](architecture/patterns.md)

### Phase 6: Head starts for areas 2-4

- [x] Area 2 workflows: contracts and a mock-backed API with `meta.mock` (#113), the board, timeline, instance and task list (#114), the guide [`docs/team/area-2-workflow-automation.md`](team/area-2-workflow-automation.md); 47 named test skeletons for the owner
- [x] Area 3 attendance/leave/reporting: contracts, real reads of the seeded rules and template, and sample runs, preview rows and management reports with `meta.mock` (#117); consolidation, category rules, template preview and reports (#118); the guide [`docs/team/area-3-attendance-leave-reporting.md`](team/area-3-attendance-leave-reporting.md); 37 named test skeletons for the owner
- [x] Area 4 governance/security/monitoring: contracts, real reads of the access policy, the classification, transfer and retention registers and the audit log with its chain check, and sample dashboards with `meta.mock` (#120); the governance pages, the audit-log viewer and the dashboards (#121); the guide [`docs/team/area-4-governance-security-monitoring.md`](team/area-4-governance-security-monitoring.md); 36 named test skeletons for the owner
- [x] Playwright screenshots of every page in both themes: [`docs/design/screenshots/README.md`](design/screenshots/README.md) indexes all 25 pages, light and dark, with Chinese where the area captured it

### Phase 7: 3D integration map

- [x] Blender scripts -> GLB -> gltf-transform (<= 1.5 MB): [`assets-src/3d/`](../assets-src/3d/README.md), built headless with Blender 5.2.1 LTS. The core is 16.6 KB, the node pod 28.5 KB and the platform 51.0 KB; with the fallback still (92.7 KB), that is 188.8 KB of the 1.5 MB budget. Quantised rather than Draco-compressed, because the CSP allows no WebAssembly ([ADR 0020](adr/0020-3d-assets-without-wasm-decoders.md))
- [x] R3F scene ([`features/integration-map/`](../apps/web/src/features/integration-map/)): the crystal core with its inner light, a platform per region and a pod per system, with packets on arcs to the core, lit by the stored state and by live `sync.progress` events. ACES tone mapping, a Lightformer environment, soft PCF shadows, bloom, a tilt-shift depth of field and a CSS vignette over a transparent canvas ([ADR 0021](adr/0021-integration-map-scene.md)). The camera drifts until the user orbits; hovering names a pod, and clicking opens its connector. The list beside the scene carries the same states and links for keyboard and screen-reader users, with a pause control (WCAG 2.2.2), a still frame under reduced motion and the Blender still without WebGL. The scene is its own chunk (75.7 KB gzip, plus 248.6 KB of three.js and React Three Fiber shared with the sign-in teaser); 35 unit and page tests, and an e2e spec with axe in both languages
- [x] Frame rate measured on the production bundle, below

Frame rate, measured in Chromium (ANGLE on Direct3D 11) on the team lead's laptop, a Core i9-12900H with two GPUs, at full quality (the pixel ratio matched the device's). Headless Chromium does not wait for the display, so the rates are uncapped: on a 60 Hz screen each configuration holds 60 fps, with the headroom shown. The scene had 12 pods, because the local database held 17 draft Malaysia connectors from earlier e2e runs; a fresh seed draws 6.

| GPU                        | Viewport       | Mean fps | 95th / 99th percentile frame | Frames over 20 ms |
| -------------------------- | -------------- | -------- | ---------------------------- | ----------------- |
| NVIDIA RTX 3060 Laptop     | 1440×900, 1×   | 139.6    | 10.0 / 10.1 ms               | 0 of 1,396        |
| NVIDIA RTX 3060 Laptop     | 1280×720, 1.5× | 118.4    | 10.1 / 13.4 ms               | 1 of 1,185        |
| Intel Iris Xe (integrated) | 1440×900, 1×   | 93.2     | 13.4 / 14.5 ms               | 0 of 931          |
| Intel Iris Xe (integrated) | 1280×720, 1.5× | 86.8     | 13.6 / 16.7 ms               | 4 of 868          |
| Intel Iris Xe (integrated) | 1920×1080, 1×  | 89.5     | 13.5 / 16.6 ms               | 0 of 895          |

- **The honest limit.** The integrated GPU is the closer stand-in for a mid-range office laptop, but this CPU is faster than a mid-range one, so a mid-range laptop has less headroom than these figures show. The scene has not been measured on one.
- **Paused means paused.** WebGL draw calls counted over two seconds: about 15,000 to 23,000 while the scene runs, and none while it is paused, in a hidden tab or scrolled off screen.
- **Adaptive quality, fixed by measuring.** The first measurement found drei's PerformanceMonitor locking the RTX 3060 to low quality after 10.5 seconds. With `nextQuality` ([ADR 0021](adr/0021-integration-map-scene.md)), the scene held the full pixel ratio of 1.5 for the whole 25-second trace.

### Phase 8: Diagrams

- [ ] Mermaid sources + SVGs; `docs/architecture/README.md`; `docs/architecture/patterns.md`

### Phase 9: Slides

- [ ] Marp deck + theme; PDF/HTML/PPTX export

### Phase 10: Hardening and handover

- [ ] Security checklist + dependency audit; axe pass; Lighthouse; secrets and attribution sweeps
- [ ] README, CONTRIBUTING, final build report; clean-state verification

## Prompt 002 checklist: Azri's integrated plan

Azri wrote a separate plan for Problem Statement #17. The team kept its own stack, ownership areas and backlog, and folded in ten of the plan's ideas, each credited to Azri where it is used. Each item went through its own branch and pull request. Legend as above.

- [~] **1. One hero journey across all four areas.** [`docs/agile/hero-journey.md`](agile/hero-journey.md) (#97): eight steps from an OA approval to the overview, each with its owning area, as the demo spine for W5 and W18 with a presenter slot per area. E2E #1 to #3 are Playwright specs (#111, story P-9): step 1 of E2E #1 (the signed approval event reaches HuiTong), the AI mapping and approval of E2E #2, and HQ's refusal in the record drawer and the raw API of E2E #3 run in CI today. The other steps are `fixme` with their story keys until areas 2 and 3 and stories A-5, B-6, D-4 and F-2 land.
- [~] **2. Draft-to-active lifecycle.** A written rule (#105) in CLAUDE.md, assumption A-21, an ADR 0002 amendment, the GRS register, module ownership, the area 1 guide and the journey maps: an OA approval creates only a `PRE_HIRE` draft, which becomes active after the onboarding milestones and the verified SG HR record, and a write to a system of record needs an audited approval of a preview, demonstrated only on the mocks. The code is story B-6, with C-3 in sprint 9; the area 2 guide (Phase 6) starts from this rule.
- [x] **3. Identity matching rule** (#108, B-5). Only the same group employee number confirms a match. A sync preview lists look-alike records (the same Chinese name, the same romanisation, the same names in another order, the same email in another letter case) as possible matches for HR, never merged. Its tests include 陈伟 and 陈玮, two people who are both "Chen Wei", and 陈伟明 romanised as both "Tan Wei Ming" and "Chen Weiming". A work email another employee already holds is refused as `WORK_EMAIL_IN_USE`.
- [x] **4. Per-destination field allowlist, default deny** (#110, B-7). The cross-border transfer register is the allowlist, so there is no second mechanism: another entity's field is shown only when an ACTIVE entry shares it with the reader's entity, in every API path, and that entity's records are hidden whole while any field the list shows, searches, filters or sorts by is withheld. Entries are versioned, and a response that withholds fields is audited with the entry versions. Area 3's export uses the same `FieldMasker.withheld`; area 4 administers the register (F-4).
- [x] **5. Chinese-data robustness** (#109, A-7). Samples in UTF-8 with or without a byte-order mark, GBK, GB18030 and Excel read correctly, with byte-exact fixtures. HR chooses between two readings when the bytes read sensibly both ways, and other encodings are refused with how to save the file as UTF-8. [`docs/architecture/data-formats.md`](architecture/data-formats.md) records each system's date formats, time zones and effective dates.
- [x] **6. Honesty labels, and no identifiers to AI** (#106, A-8; #107, E-5). A "Mock" badge on every connector a HuiTong mock stands in for, a "Mock AI" badge on output from the deterministic provider, and the steps to switch to Bedrock for a demo. The AI explainer carries no employee identifier and withholds identifying values, and a column that names a person never becomes a category column. The rule is in CLAUDE.md, the GRS register and an ADR 0011 amendment.
- [x] **7. Three sample packs first** (#97). "Three items to request first" opens [`docs/client/questions-for-client.md`](client/questions-for-client.md). Azri's six consolidated questions map onto existing ids, and Q-08, Q-24, Q-33, Q-47 and Q-55 were extended where they missed part of Azri's.
- [x] **8. Failure and edge-case matrix** (#97). The [test plan](agile/test-plan.md) lists approvals, identity and sync, input files, AI and policy, and recovery cases, each with its owning area and the test or story that covers it.
- [x] **9. Measurement protocol** (#97). The [success metrics](design-thinking/success-metrics.md) define how manual steps removed, leave-report preparation time and new-subsidiary setup effort are measured, labelled as laboratory estimates on synthetic data until the client gives baselines.
- [x] **10. Demo reliability and backups** (#97). P-8 gains a one-click reset that refuses non-demo databases, a timed rehearsal, a recorded backup demo and a tested Docker fallback, all built in Phase 10. [Module ownership](team/module-ownership.md#backup-owners) has a backup owner per area (TBD until the owners are agreed), and every member reviews at least one teammate's critical pull request.
- [x] **Not adopted.** [ADR 0019](adr/0019-ideas-not-adopted-from-azri-plan.md) (#97): the FastAPI backend, the plan's ownership split and its generic 12-week roadmap, with the reasons.
- [x] **Finish.** This checklist and its verification log, the [AI usage log](ai/ai-usage-log.md) and the [traceability matrix](requirements-traceability.md).

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

### Phase 3 (20 Oct 2026)

| Check                                       | Result                                                                                                                                                                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check`           | 0 problems / all files formatted                                                                                                                                                                                                                                                                      |
| `pnpm typecheck`                            | All 7 packages pass (`apps/web` checks both its app and Node configs)                                                                                                                                                                                                                                 |
| `pnpm test`                                 | 152 tests pass: shared 19, synthetic-data 23, mock-sg-hr 10, mock-cn-hq 8, mock-oa 9, web 15, api 68 (43 unit + 25 integration against PostgreSQL and Redis)                                                                                                                                          |
| `pnpm build`                                | All packages build                                                                                                                                                                                                                                                                                    |
| Smoke test (built API)                      | Health with database and Redis up; error envelope `traceId` equals the `X-Request-Id` sent; CSRF rejection without the header; demo login sets HttpOnly SameSite=Strict cookies on the right paths; `GET /api/v1/auth/me` works; `GET /api/v1/users` returns 403 for HR_SG; Swagger lists every route |
| `docker compose up --build` (empty volumes) | Both migrations applied and the seed ran inside the API container, which then runs as PID 1; all seven services healthy; API reachable through nginx with one CSP and Secure cookies                                                                                                                  |
| Restart on existing volumes                 | No pending migrations; the seed reruns idempotently; the API reports healthy                                                                                                                                                                                                                          |
| Request logs                                | One JSON line per request with the caller's `X-Request-Id` as `req.id`; `cookie` and `set-cookie` values are logged as `[redacted]` (checked with probe cookies through nginx)                                                                                                                        |
| Raw-SQL lint rule                           | `eslint --print-config` shows `no-restricted-properties` as an error for `$queryRawUnsafe` and `$executeRawUnsafe` in API code                                                                                                                                                                        |
| Flakiness                                   | One full parallel `pnpm test` run failed while a Docker rebuild was running and its output was not captured; four further full runs passed. Watch for a recurrence in CI                                                                                                                              |

Defects found and fixed while verifying:

- `pg_advisory_xact_lock` returns `void`, which Prisma's `$queryRaw` cannot deserialise; the audit writer now uses the function as a table source.
- helmet merged our API CSP with its defaults; `useDefaults: false` makes it exactly `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`.
- nginx added its static-site headers to proxied API responses (two CSPs); API responses now carry only the API's own headers.
- The compose demo stack needed `DEMO_MODE=true` while running `NODE_ENV=production`; the deployment kind is now `APP_ENV` (local, demo, production) and the safety rules apply to production only.
- Updating the traceability matrix exposed missing evidence: no unit tests for the guards or password hashing, no 429 test and no audit assertions for sign-in and sign-out. All were added (13 unit tests, 1 integration test, 2 assertions).
- Nothing stopped unsafe raw SQL; the `nest` lint preset now bans `$queryRawUnsafe` and `$executeRawUnsafe`.
- The Prisma CLI called its update-check service from the container on every start and printed an upgrade banner; the runtime image sets `CHECKPOINT_DISABLE=1` and `PRISMA_HIDE_UPDATE_MESSAGE=1`.

Incident: a quoting mistake in an inline shell command ran `docker compose down -v` mid-build, deleting the local databases (synthetic and reseedable) and garbling this report. The stack was rebuilt from empty volumes, which re-verified the migrations and seed (the compose row above), and this report was restored. Scripts are now written to files instead of being passed as inline shell strings.

### Phase 4 (20 Oct 2026)

| Check                                                   | Result                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check`                       | 0 problems / all files formatted                                                                                                                                                                                                         |
| `pnpm typecheck`                                        | All 7 packages pass                                                                                                                                                                                                                      |
| `pnpm test`                                             | 320 tests pass: shared 19, synthetic-data 23, mock-sg-hr 10, mock-cn-hq 8, mock-oa 9, web 174, api 77                                                                                                                                    |
| `pnpm build`                                            | All packages build                                                                                                                                                                                                                       |
| Bundle budget (`pnpm --filter @huitong/web budget`)     | Initial JS 213.7 KB gzip against the 250 KB budget. Totals for a first visit: sign-in page 306.6 KB, signed-in shell 256.0 KB, overview 327.9 KB. The 3D teaser and the other pages are separate chunks                                  |
| Colour contrast (`tokens.test.ts`)                      | 70 checks across both themes: text pairs at least 4.5:1, focus rings, borders and chart colours at least 3:1                                                                                                                             |
| Browser (Playwright against the built app behind nginx) | Landing, sign-in, overview, settings, 404, command palette and notifications in light/English and dark/中文: no CSP violations and no failed asset loads; the only console errors are the expected 401s from the anonymous session check |
| `docker compose up --build`                             | All seven services healthy with the Phase 4 images                                                                                                                                                                                       |
| Licence key                                             | Absent from every tracked and committable file (byte-for-byte scan before the commit; value never printed)                                                                                                                               |

Defects found and fixed while verifying:

- The current shadcn `CommandDialog` no longer wraps its children in cmdk's `<Command>`, so opening the palette crashed in the browser. The palette now wraps them, with a regression test.
- The web CSP `style-src 'self'` blocked the inline styles that sonner and Radix inject at runtime. Styles may now be inline; scripts stay strict ([ADR 0018](adr/0018-web-csp-inline-styles.md)).
- Vite inlined small font files as `data:` URIs, which `font-src 'self'` blocks; fonts are never inlined now.
- On the landing page, the client tried `POST /auth/refresh` without a session and got 403 (no CSRF cookie). It now skips the refresh when no session was ever started.
- `cn` dropped the custom `text-display` class as a colour conflict, so the headline rendered at body size; the merge config now knows the custom type sizes.
- `space-y` margins reached the absolutely positioned layers of SpotlightCard and drew a double edge; the layers reset their margins.
- FuzzyText passed CSS `var()` references to a canvas, which cannot resolve them; it now resolves token colours first.
- The contrast test failed chart colour 3 at 2.53:1; it was darkened.
- The top-bar separator and the sync-health columns were misaligned, and the Chinese headline animation was too slow; all three were adjusted after reviewing the screenshots.
- React Router warned about a missing hydrate fallback; the root route now shows a boot splash.
- Page tests timed out under the full parallel run; the async utility and test timeouts were raised (5 s and 15 s).
- The pre-commit hook failed on this phase's commit, which staged more than 200 files. lint-staged splits file lists to fit the cmd.exe line limit, but pnpm's `.CMD` shims add their own paths and overflow it; the hook now passes `--max-arg-length 4096`.

Note: the React Bits Pro registry reset the TLS handshake throughout this phase, so the landing page shipped with free items. The follow-up below adds the Pro block.

### Phase 4 follow-up: React Bits Pro block (20 Oct 2026)

The Pro registry answered again after the Phase 4 commit, so the sign-in page was rebuilt on the Pro block `auth-4`: the form beside the product story in one card, with the 3D teaser inside the block's orbital ring. Aurora was removed and the block's spinning orbit and floating chips were dropped, so the teaser is the page's one ambient effect. It plays for at most five seconds each time it comes into view.

| Check                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check` / `pnpm typecheck`    | 0 problems / all files formatted / all 7 packages pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm test`                                             | 328 tests pass: shared 19, synthetic-data 23, mock-sg-hr 10, mock-cn-hq 8, mock-oa 9, web 182, api 77                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm build` and bundle budget                          | All packages build. Initial JS 213.8 KB gzip against the 250 KB budget; a first visit to the sign-in page is 303.7 KB, against 306.6 KB in Phase 4 (Aurora gone, the 0.2 KB error-boundary package added)                                                                                                                                                                                                                                                                                                                                   |
| Layout                                                  | Screenshots at 1440, 1024, 768 and 390 px, in both themes and both languages, and with reduced motion                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Browser (Playwright against the built app behind nginx) | Sign-in, demo sign-in, overview, command palette, settings, 404 and governance in light/English, dark/English, light/中文 and dark/中文, plus the six sign-in layouts from the row above: no CSP violations and no page errors. The console shows only the expected 401 from the anonymous session check and a deprecation warning that React Three Fiber triggers inside three.js (`THREE.Clock`)                                                                                                                                          |
| Independent review                                      | Three reviewers (UI and accessibility, code correctness, docs and governance) raised 23 findings on the uncommitted change, about 16 distinct once duplicates merged. The skeptic pass that should have re-checked them stopped at a usage limit, so each one was re-checked against the code by hand. All were real and are fixed below, except deleting the root copy of the licence key, which is the owner's decision (manual step 2). Each new safety test was checked against a deliberately broken copy of the code, and fails on it |
| Licence key                                             | Absent from all 491 tracked and committable files (byte-for-byte scan before the commit; value never printed)                                                                                                                                                                                                                                                                                                                                                                                                                               |

Defects found and fixed while verifying:

- The orbit rings were invisible in dark mode, because `--border` and `--muted` are the same step there (neutral-850); the rings now use `--border-strong`.
- The block places its chips around a static logo. Around the rotating 3D systems they covered spheres, so from `sm` up they now sit above and below the band the systems move in. On phones, where they reached the card edge, they wrap in a row under the orbit.
- The block centres its form but pins the footnote to the column edge; the footnote now shares the form's left edge.
- Demo-role buttons in the same row had different heights; they now fill the row.

Found by the review and fixed:

- **Sign-in could be lost to a decorative picture.** If the 3D teaser's chunk failed to load (a flaky network, or a redeploy that removed old files), or WebGL failed to start, the error replaced the whole sign-in page. The teaser now falls back to its static drawing (an import fallback and an error boundary from `react-error-boundary`), with a test for each path.
- **WCAG 2.2.2 (Pause, Stop, Hide).** The teaser, the orbit and the Sign in button's star moved without end beside the form, with no way to stop them. The orbit is now static, the teaser plays for at most five seconds per appearance (`useAutoplayWindow`), and the star comes to rest after four seconds. Hover and focus still send it round once more.
- **Line length.** Prose in the aside ran to 90–135 characters at tablet widths. Measuring Geist showed that `max-w-prose` allows about 92 characters, so the design system's own advice was wrong. The aside, the page-header description and the overview's first-run callout now use the measured widths, and the rule in `design-system.md` gives them.
- The statement animated on load even when stacked below the form on phones; it now waits until it comes into view. The points used an off-grid gap (`gap-5`, now `gap-6`).
- `text-display` had no users left, so it was retired; the scale now has six sizes.
- The new layout and orbit tests did not check visibility or motion; they now do, including the reduced-motion path.
- The licence notes left out the licensed React Bits skill, tracked since Phase 2. M3-06, R-17 and manual step 1 now name it. R-17's heat-map cell, assumption A-47, the line on where the key lives and the M3-06 evidence were corrected, and `hero-33`'s description in the register was made accurate.

### Licence-key guard (20 Oct 2026)

The traceability matrix claimed a key scan before every commit, but only some commits had one, and the scan was a local script. `scripts/check-licence-key.mjs` now runs first in the pre-commit hook. It reads the key from the git-ignored `.env.local` files and refuses the commit if any added line contains it. It reports file names only, never the key. Checked in a throwaway repository with a fake key:

| Case                                                    | Result              |
| ------------------------------------------------------- | ------------------- |
| Clean file staged                                       | Commit allowed      |
| Text file containing the key                            | Refused, file named |
| Binary file containing the key                          | Refused, file named |
| `apps/web/.env.local` force-added                       | Refused, file named |
| Key only in the root `.env.local`                       | Refused, file named |
| No key configured (CI, or a teammate without a licence) | Commit allowed      |

The guard checks only the lines a commit adds. The full repository and its history get the Phase 10 sweep.

### Phase 5 (20 and 21 Oct 2026)

| Check                             | Result                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check` | 0 problems / all files formatted                                                                                                                                                                                                                        |
| `pnpm typecheck`                  | All 7 packages pass                                                                                                                                                                                                                                     |
| `pnpm test`                       | 470 tests pass: shared 24, synthetic-data 23, mock-sg-hr 10, mock-cn-hq 8, mock-oa 9, web 249, api 147 (the API integration suites run against PostgreSQL and Redis, with the mock systems in-process)                                                  |
| `pnpm build`                      | All packages build                                                                                                                                                                                                                                      |
| Bundle budget                     | Initial JS 225.9 KB gzip against the 250 KB budget (213.7 KB after Phase 4). The growth is the employees and connectors strings: every namespace ships in the entry bundle, so areas 2 to 4 will need lazy namespaces before their strings push it over |
| `pnpm test:e2e`                   | The smoke test passes against `docker compose up --build`: four consecutive runs on a running stack, axe clean at all seven steps                                                                                                                       |
| Branch by branch                  | `feat/area1-employees-page` and `feat/area1-connectors-page` each passed format, lint, typecheck, the web tests and the build on their own, in a clean worktree                                                                                         |
| `docker compose up --build`       | All seven services healthy with the Phase 5 images                                                                                                                                                                                                      |
| Licence key                       | Absent from all 19 commits and 705 working-tree files (scan before the push; value never printed)                                                                                                                                                       |
| actionlint                        | Every workflow passes, including the new End-to-end smoke job                                                                                                                                                                                           |

Defects found and fixed while verifying:

- A sync run whose queue job was lost stayed queued and blocked its connector; such runs now settle as `INTERRUPTED`. The Docker seed imported a file the image does not contain; it moved into `prisma/seed`.
- HoldButton read its hint twice to screen readers, and HoldButton and ThoughtLine created runtime `<style>` elements, which ADR 0018 rules out; the styles moved to stylesheets.
- The typed value in the conflict dialog had no label; the approve step was offered to roles without `mappings:approve`; a new draft kept the AI's target for a national ID column (it was never sent, but showed); connector names and health messages appeared in English in the Chinese UI, and run errors showed the server's English.
- axe in the smoke test found visible labels missing from accessible names (WCAG 2.5.3) on the language and account buttons, the record links, the connector cards and the wizard steps; a sidebar that was not a navigation landmark, and its mobile sheet in English; view tabs without panels; inactive tabs below 4.5:1; and a scroll region out of keyboard reach. axe also reported low contrast on content still fading in, so the test runs with reduced motion.
- Three components were over the 200-line limit and were split.

Notes:

- A six-lens review workflow and a docs workflow both stopped at the session limit before their agents reported, so the review checks were run by hand (locale parity, hard-coded strings, unused keys, ARIA references, permission gating against the API) and the area-1 guide was written directly, then checked against the code.
- On Docker Desktop for Windows, the first page load after a container restart sometimes stalls or is reset, and recording a Playwright trace slowed the software-rendered 3D teaser enough to stall the sign-in page. Traces are now recorded only on the CI retry; CI runs on Linux, where neither problem has been seen.
- No connector test feeds a malformed response yet (M4.1-08), and the screenshots for the masking and preview rows are still to be taken.

### Pull requests and CI (21 Oct 2026)

The platform base reached `main` as eleven pull requests, one task each, merged in order with merge commits: #64, #65, #66, #75, #78, #80, #83, #84, #85, #86 and this one. Each followed the template: the stories it closes, the evidence for each acceptance criterion, real verification results, and screenshots for UI changes, taken from a Docker build of that branch (`docs/design/screenshots/`).

| Check                    | Result                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CI on every pull request | Lint, typecheck, test, build; Docker images with Trivy; CodeQL for JavaScript/TypeScript and Actions; dependency review; the IaC scan; and, from #86, the end-to-end smoke test. All green before each merge |
| Tests on Linux           | 445 when the Employees page merged (#84): web 224, api 147, shared 24, synthetic-data 23, the three mocks 27                                                                                                 |
| `pnpm audit`             | 0 vulnerabilities                                                                                                                                                                                            |
| Backlog                  | 19 sprint milestones, 9 epics and 53 stories with sub-issues, and the HuiTong delivery board with a Sprint board view. A story closes only when every criterion is met                                       |
| Repository settings      | Dependency graph and Dependabot alerts, secret scanning with push protection, private vulnerability reporting; the `Protect main` ruleset (id 25503945) from the end of the stack                            |

Found while opening the pull requests, and fixed in them:

- Dependency review could not run until the dependency graph was on (#66).
- Trivy flagged that the web Dockerfile names no user; it now says `USER 101`, the uid the base image already used (#66).
- CodeQL flagged the employee list's sort as a lookup keyed by request input; it is a switch now (#80).
- The Run sync preview showed a conflict's candidate values as raw JSON; it lists each system's value now, with a regression test (#84).
- CodeQL's first findings on `main` were triaged: seven false positives in the mocks and the auth guard were dismissed with their reasons (#82).

Found while gathering the evidence, and filed for their own branches:

| Issue | Finding                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #76   | An apply re-read the source, so it could write a change made after its preview (B-4)                                                                   |
| #79   | The AI explainer sent the employee's name, which ADR 0011 rules out; #77, a test that values above Internal stay out of the prompt, goes with it (E-3) |
| #67   | The wizard said no sample value reaches the AI, but category codes do (E-1); ADR 0011 needs an amendment                                               |
| #81   | Gender columns are not blocked, and blocked columns still reach the mapping prompt (ADR 0011)                                                          |
| #68   | A-2 expected 年假 from the employee sync; leave categories belong to D-2                                                                               |
| #69   | The overview's out-of-date notice had no test (P-4)                                                                                                    |
| #82   | Scorecard's first findings to fix or accept, such as pnpm pinned by version rather than hash in the Dockerfiles                                        |

Stories with an unmet criterion stay open until their fix merges: A-2 (#13), B-4 (#22), E-1 (#24) and E-3 (#26).

### Follow-up fixes (21 Oct 2026)

The gaps filed above were fixed one per pull request, with all nine CI checks green before each merge. The four stories they held open are closed.

| Pull request  | Fix                                                                                                                                                                                        | Closes                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| #88           | The AI explainer is told the employee number instead of the name, and values above Internal are sent as `null`. #107 later removed the employee number too                                 | #79, #77, E-3 #26                              |
| #89           | An apply writes exactly what its preview showed: the preview stores a fingerprint of its changes, and an apply whose source has changed since fails with `SOURCE_CHANGED`, writing nothing | #76, B-4 #22                                   |
| #90           | The mapping wizard and the docs say exactly what reaches the AI: a category column's distinct codes, within limits, and no personal value. ADR 0011 gains an amendment                     | #67, E-1 #24                                   |
| #91           | Gender columns are withheld like national ID columns, and a withheld column, even its header, never reaches the prompt                                                                     | #81                                            |
| #92           | 年假 moves from A-2's acceptance criteria to D-2, because leave categories are area 3's mapping                                                                                            | #68, A-2 #13                                   |
| #93           | Tests for the overview's out-of-date notice                                                                                                                                                | #69                                            |
| #95           | The first CodeQL and Scorecard findings, each fixed or accepted with its reason in `docs/security/security-testing.md`                                                                     | #82                                            |
| #94, #96, #70 | Dependabot ignores runtime majors, so Node.js 24 stays until an ADR changes it; CI's Redis matches compose (8.10.2); Recharts 3.10.1 without the deprecated legend prop                    | Dependabot's #72 to #74, closed with a pointer |

### Prompt 002 (21 Oct 2026)

| Check                           | Result                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI on every pull request        | #97 and #105 to #111: all nine checks green before each merge                                                                                                                               |
| Tests on Linux (CI on #111)     | 548 pass: web 259, api 212 (unit tests, and integration tests against PostgreSQL and Redis), shared 27, synthetic-data 23, the three mocks 27                                               |
| End-to-end (CI on #111)         | 14 tests against the production images: 4 pass (the smoke test and the parts of E2E #1 to #3 that are built) and 10 are `fixme` with their story keys. axe is clean at every step that runs |
| Bundle budget                   | Initial JS 226.6 KB gzip against the 250 KB budget (225.9 KB at the end of Phase 5)                                                                                                         |
| `pnpm audit --audit-level high` | Passes, with the one documented exception (GHSA-vfj7-8cjw-p6xm, see `pnpm-workspace.yaml`)                                                                                                  |
| Migrations                      | `connector_is_mock` (#106), which also marks the existing rows, and `transfer_policy_version` (#110)                                                                                        |
| Screenshots                     | #106, #108, #109 and #110, in English and Chinese, from a Docker build of each branch (`docs/design/screenshots/`)                                                                          |
| Licence key                     | Absent from every pushed commit: the unpushed commits were scanned before each push, and the value was never printed                                                                        |

Defects found and fixed while verifying:

- Only the Teams and DingTalk connectors said they were mocked. Nothing marked SG HR, CN HQ and OA, which are mocks too, and the AI output carried no label (#106).
- Writing down the no-identifiers rule showed three gaps (#107): the explainer still sent the employee number, a conflict on a name or a work email sent both values, and a "Department Head" (部门负责人) column could pass a person's name to the model as a category code.
- A review of the identity branch before pushing found that a work email already held by another employee hit the database's unique key and stopped the whole sync run; it is now a `WORK_EMAIL_IN_USE` error on that record, and the run goes on. The same review found that the first possible-match lookup queried once per record, could not compare normalised names and capped its results; a preview now reads every employee's identity details once and compares them in memory (#108).
- The integration tests polled run status fast enough to reach the API's rate limit; they poll every 250 ms (#108).
- The reason on a withheld field said it could not "leave Singapore", which is wrong for CN01 data; it now names the cross-border transfer (#110).
- With ten or more notifications, the bell's accessible name did not contain its visible "9+" (WCAG 2.5.3). The hero-journey specs found it on a long-lived stack; a fresh CI stack never has that many (#111).

Notes:

- The review and critique planned as workflows for the allowlist (#110) stopped at the session limit before reporting, so both were done directly against the code.
- Local test runs used a portable Node.js 24.22.0, because the machine's Node.js 24.15.0 aborts API test workers (manual step 8).

## Manual steps for the owner

Step 1 records a decision already taken. The others improve the local setup.

1. **Repository visibility (decided).** The GitHub repository is public. `feat/platform-base` contains licensed React Bits material: the React Bits skill (`.claude/skills/reactbits/SKILL.md`) since Phase 2, and Pro code since the Phase 4 follow-up. CLAUDE.md asked for a private repository while it holds that material; on 20 Oct 2026 the team lead decided to keep it public and accepted the licence risk (ADR 0017 amendment, GRS risk R-17). Check that the Pro licence allows source in a public repository; if it does not, the Pro items and the skill have to go and the history be rewritten. The licence key itself is never pushed: a scan of the full history before the first push found it nowhere. Teammate Angelyn's `feat/foundation` branch and PR #1 were left as they are.
2. **Licence key copies (optional).** CLAUDE.md section 9 keeps `REACTBITS_LICENSE_KEY` only in `apps/web/.env.local`, where the shadcn CLI reads it. Your root `.env.local` still holds the original, which this build copied from and left alone. Both files are git-ignored. Delete the root copy if you want the strict setup.
3. **Blender on PATH (optional).** Blender 5.2.1 LTS is installed at `C:\Program Files\Blender Foundation\Blender 5.2\`. The asset scripts call it by full path, so nothing is required. To run `blender` directly, add that folder to your user `Path` environment variable.
4. **corepack (optional).** `corepack enable` fails without admin rights because it writes shims into `C:\Program Files\nodejs`. pnpm was installed with `npm i -g pnpm` instead, which needs no admin rights.
5. **Docker Desktop.** It was started from the terminal for this build. Enable "Start Docker Desktop when you sign in" in Docker Desktop settings if you want it running by default.
6. **shadcn MCP server.** `.mcp.json` registers the shadcn MCP server (pointed at `apps/web`). It loads in the next Claude Code session; approve the `shadcn` server when prompted. If it fails to start on native Windows, register it locally with `claude mcp add shadcn -- cmd /c npx -y shadcn@4.22.0 mcp --cwd apps/web`.
7. **CODEOWNERS and backup owners.** Replace the placeholder handles in `.github/CODEOWNERS` with real GitHub usernames once areas 2-4 are assigned, then uncomment the rules. Name a backup owner for each area in [`docs/team/module-ownership.md`](team/module-ownership.md#backup-owners) at the same time.
8. **Upgrade Node.js to 24.22.** This machine runs Node 24.15.0 from `C:\Program Files\nodejs`, while `.node-version`, CI and the Docker images use 24.22.0, and `package.json` now asks for 24.22 or newer. On 24.15.0 about one API integration test file in eight died with a silent native abort (`Worker exited unexpectedly with exit code 3221226505`, 0xC0000409) in both the forks and threads pools; on 24.22.0 there were none in 88 file runs (20 Oct 2026). Install 24.22 from nodejs.org (the installer needs admin rights).
9. **Sign in to the GitHub CLI (done, 21 Oct 2026).** The task branches are pushed and merged through pull requests, and the backlog and board are seeded.
10. **Wiki.** The wiki is off. Turn it on (Settings, Features), create any first page in the browser so that GitHub creates its repository, then run `node scripts/github/publish-wiki.mjs`.
11. **Board grouping.** On the HuiTong delivery board, open the Backlog view and choose Group by, then Sprint, once. GitHub's API cannot set grouping.
12. **Licence file.** Scorecard notes that the repository has no licence file. Choosing one is the team lead's decision, given the licensed React Bits Pro code (#82).
13. **Two rulesets on `main`.** The `protect-main` ruleset (id 25411321) from 19 Oct requires pull requests, and `Protect main` (id 25503945, from `.github/rulesets/main.json`) adds the required checks and the CodeQL gate. Both apply together without conflict. Delete the older one if you want a single source, kept as code.
14. **Client sample packs.** At the first client meeting (W2 or W3), ask for the [three sample packs](client/questions-for-client.md#three-items-to-request-first) before the other questions: the SG HR employee-master sample, the HQ reporting template with a completed example, and an approved OA manpower request with its onboarding history. The table there lists what each pack unblocks and which questions it answers.
