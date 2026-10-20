# Build report: platform base (prompt 001)

Status of the platform-base build on branch `feat/platform-base`. The checklist below is kept current as each phase lands; the sections after it summarise verification evidence.

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
- [x] `docs/client/questions-for-client.md` (56 prioritised questions, Q-01 to Q-56)
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

## Manual steps for the owner

Step 1 must be done before this branch is pushed. The others improve the local setup.

1. **Make the GitHub repository private before pushing.** On 20 Oct 2026 an anonymous GitHub API request returned `xiu2809xiu-rgb/sccci-innovation-project`, so the repository is public. `feat/platform-base` contains licensed React Bits material: the React Bits skill (`.claude/skills/reactbits/SKILL.md`) since Phase 2, and Pro code since the Phase 4 follow-up. The licence allows both only in a private repository (CLAUDE.md section 9, ADR 0017, GRS risk R-17). Change the visibility under Settings → General → Danger Zone, then check that the repository page returns 404 when you are signed out. What is public today holds no licensed material: the initial commit on `main`, and a teammate's `feat/foundation` branch with PR #1, which this build did not create or touch (scanned for the key and React Bits material on 20 Oct 2026).
2. **Licence key copies (optional).** CLAUDE.md section 9 keeps `REACTBITS_LICENSE_KEY` only in `apps/web/.env.local`, where the shadcn CLI reads it. Your root `.env.local` still holds the original, which this build copied from and left alone. Both files are git-ignored. Delete the root copy if you want the strict setup.
3. **Blender on PATH (optional).** Blender 5.2.1 LTS is installed at `C:\Program Files\Blender Foundation\Blender 5.2\`. The asset scripts call it by full path, so nothing is required. To run `blender` directly, add that folder to your user `Path` environment variable.
4. **corepack (optional).** `corepack enable` fails without admin rights because it writes shims into `C:\Program Files\nodejs`. pnpm was installed with `npm i -g pnpm` instead, which needs no admin rights.
5. **Docker Desktop.** It was started from the terminal for this build. Enable "Start Docker Desktop when you sign in" in Docker Desktop settings if you want it running by default.
6. **shadcn MCP server.** `.mcp.json` registers the shadcn MCP server (pointed at `apps/web`). It loads in the next Claude Code session; approve the `shadcn` server when prompted. If it fails to start on native Windows, register it locally with `claude mcp add shadcn -- cmd /c npx -y shadcn@4.22.0 mcp --cwd apps/web`.
7. **CODEOWNERS.** Replace the placeholder handles in `.github/CODEOWNERS` with real GitHub usernames once areas 2-4 are assigned, then uncomment the rules.
