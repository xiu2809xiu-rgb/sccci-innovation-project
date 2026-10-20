# ADR 0017: shadcn registries for UI components and React Bits licence handling

- **Status:** Accepted; amended 2026-10-20 ([a public repository](#amendment-20-oct-2026-a-public-repository))
- **Date:** 2026-10-20
- **Traceability:** M1, M3, M4 · capabilities A–G (every screen)

## Context

`CLAUDE.md` section 9 asks for extensive, native-looking use of React Bits (free and Pro) and Magic UI, installed through the shadcn CLI, with:

- the TypeScript + Tailwind variant of every item;
- one component per file, adapted to our design tokens, with a header comment stating its origin;
- a record in `docs/design/reactbits-usage.md` (item, where it is used, why, and its reduced-motion behaviour), and every unused item deleted.

React Bits Pro is paid. The licence key must never be printed, committed or copied into docs, prompts or logs, and `CLAUDE.md` asked for the repository to stay private while it holds Pro code ([R-17](../grs/grs-by-design.md#32-register); M3-06). The [amendment](#amendment-20-oct-2026-a-public-repository) records that the team lead decided otherwise.

Registry items are source code copied into our repository, together with the npm dependencies they declare, sometimes as caret ranges such as `gsap@^3`. That clashes with our exact pins and the one-day release-age rule ([ADR 0003](0003-pnpm-workspaces-monorepo.md#dependency-policy)).

## Decision

**1. shadcn CLI 4 with the `radix-nova` style.** `apps/web/components.json` selects Radix primitives (the unified `radix-ui` package), Lucide icons and the Geist font. It sets CSS variables in `src/styles/globals.css`, `rsc: false`, and the aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils` and `@/hooks`. The class-name helper comes from the `cn` package, which the style's components import, re-exported from `@/lib/utils`. The CLI is pinned to 4.22.0 in `apps/web` and in the MCP configuration.

**2. Four registries beside the default shadcn/ui registry.**

| Namespace            | Source                                                                                                    | Authentication                                   | Used for                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `@react-bits`        | `https://reactbits.dev/r/{name}.json`, declared explicitly instead of relying on the CLI's built-in index | None                                             | Free React Bits items, `-TS-TW` variants                            |
| `@reactbits-starter` | `https://proxy.collectui.pro/api/r/reactbits/starter/{name}.json`                                         | `Authorization: Bearer ${REACTBITS_LICENSE_KEY}` | React Bits Pro components (`-tw` variants) and the React Bits skill |
| `@reactbits-pro`     | `https://proxy.collectui.pro/api/r/reactbits/pro/{name}.json`                                             | `Authorization: Bearer ${REACTBITS_LICENSE_KEY}` | Pro blocks, Application UI and Agent Kit                            |
| `@magicui`           | `https://magicui.design/r/{name}`                                                                         | None                                             | Magic UI free components                                            |

Phase 2 verified all four registries with a test install from each, then removed the test items.

**3. Placement and adaptation.** React Bits and Magic UI items are installed with `--path` into `apps/web/src/components/reactbits/`, one item per file.

- Each file opens with a header comment naming its registry, item and variant, and summarising what was adapted.
- Colours, radii, shadows and motion timings are replaced with tokens from `styles/tokens.css`, and every item gets a `prefers-reduced-motion` fallback.
- Heavy items (WebGL, GSAP) load lazily with their route.
- shadcn primitives stay in `components/ui/`.

**4. Re-pinning after every install.** The CLI installs an item's dependencies as the item declares them. After each install we pin every new or changed dependency to its exact resolved version, check its peer ranges against React 19.3, Tailwind CSS 4 and Motion 14, and review the diff like any other code. pnpm's release-age rule still applies, so an item cannot pull in a version less than a day old.

**5. The licence key.**

- `REACTBITS_LICENSE_KEY` lives only in `apps/web/.env.local`, which is git-ignored. `components.json` holds the `${REACTBITS_LICENSE_KEY}` placeholder, which the CLI expands at install time.
- The key has no `VITE_` prefix, so Vite never exposes it to client code. No build or CI step needs it: installed items are already source code in the repository.
- A teammate who installs Pro items gets the key from the team lead and keeps it in their own `apps/web/.env.local`.
- The Phase 10 sweep searches the repository and its history for the key, and so does a scan before every push. The repository is public (see the amendment), so these scans and the pre-commit guard are what keep the key out of it.

**6. Tooling.** The React Bits skill at `.claude/skills/reactbits/SKILL.md` is authoritative for usage, props and animation parameters; it is licensed material too. The shadcn MCP server is configured in `.mcp.json` (`shadcn mcp --cwd apps/web`), so MCP-capable editors search and install from the same registries and the same `components.json`.

## Consequences

### Positive

- Every item arrives with its provenance and a declared dependency list, and becomes our own code to adapt and test.
- One configuration file serves the CLI, the MCP server and every teammate.
- The key never reaches git, the bundle or CI.

### Negative

- Copied code has no `npm update` path: upgrading an item means adding it again and reviewing the diff ([ADR 0005](0005-web-stack.md)).
- The re-pin and peer check after each install are manual steps.
- Pro code in a public repository relies on the licence allowing it. The team lead accepted that risk (see the amendment); if the licence does not allow it, the Pro items and the skill have to be removed and the history rewritten.
- Motion-rich items can hurt performance and accessibility, so dense work surfaces get only subtle items (`CLAUDE.md` section 9).

## Amendment, 20 Oct 2026: a public repository

**Context.** The GitHub repository `xiu2809xiu-rgb/sccci-innovation-project` is public. The licensed React Bits skill has been in the history since `ff2ad33` and the Pro block `auth-4` since `458495d`, so pushing them publishes licensed material. The team now works through pull requests on GitHub, and public repositories get CodeQL code scanning, secret scanning with push protection, Dependabot, branch rules and a wiki at no cost.

**Decision.** The team lead (Richie, who holds the React Bits Pro licence) decided to keep the repository public and set aside the private-repository rule of `CLAUDE.md` section 9.

**Consequences.**

- Whether the Pro licence allows source in a public repository is the licence holder's responsibility. GRS risk R-17 is accepted at a higher residual rating.
- The licence key rules do not change: the key never enters git, docs, prompts or logs. The pre-commit guard, a history scan before every push and GitHub secret scanning enforce that.
- Client documents and NYP material marked Official (Closed) are never committed, because the repository is public.
- If the licence turns out not to allow a public repository, the Pro items (`split-auth-layout.tsx`, `trust-orbit.tsx`) and the skill are replaced with free items, and the history is rewritten or the repository made private.

## Alternatives considered

| Option                                                       | Why rejected                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Copying code by hand from the websites                       | No provenance or dependency list, easy to take the wrong variant, and unclear licence terms for Pro items |
| Putting the key in `components.json` or a committed env file | Leaks a paid licence with the repository (R-17)                                                           |
| Free registries only                                         | Loses the Pro blocks for the landing page and the Application UI that `CLAUDE.md` asks for                |
| A packaged component kit (MUI, Ant Design, Chakra UI)        | Rejected in [ADR 0005](0005-web-stack.md): an imposed look and a heavier initial bundle                   |
| A private npm package or Git submodule for Pro code          | Extra publishing and access management for a four-person team, and the code must stay private anyway      |
