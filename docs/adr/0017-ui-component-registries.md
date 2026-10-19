# ADR 0017: shadcn registries for UI components and React Bits licence handling

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M1, M3, M4 · capabilities A–G (every screen)

## Context

`CLAUDE.md` section 9 asks for extensive, native-looking use of React Bits (free and Pro) and Magic UI, installed through the shadcn CLI, with:

- the TypeScript + Tailwind variant of every item;
- one component per file, adapted to our design tokens, with a header comment stating its origin;
- a record in `docs/design/reactbits-usage.md` (item, where it is used, why, and its reduced-motion behaviour), and every unused item deleted.

React Bits Pro is paid. The licence key must never be printed, committed or copied into docs, prompts or logs, and the repository must stay private while it holds Pro code ([R-17](../grs/grs-by-design.md#32-register); M3-06).

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
- The Phase 10 sweep searches the repository and its history for the key. Before the repository is ever made public, the Pro code and the licensed skill are removed.

**6. Tooling.** The React Bits skill at `.claude/skills/reactbits/SKILL.md` is authoritative for usage, props and animation parameters; it is licensed material too. The shadcn MCP server is configured in `.mcp.json` (`shadcn mcp --cwd apps/web`), so MCP-capable editors search and install from the same registries and the same `components.json`.

## Consequences

### Positive

- Every item arrives with its provenance and a declared dependency list, and becomes our own code to adapt and test.
- One configuration file serves the CLI, the MCP server and every teammate.
- The key never reaches git, the bundle or CI.

### Negative

- Copied code has no `npm update` path: upgrading an item means adding it again and reviewing the diff ([ADR 0005](0005-web-stack.md)).
- The re-pin and peer check after each install are manual steps.
- Pro code ties the repository to private hosting. Publishing the project later means removing or replacing the Pro items first.
- Motion-rich items can hurt performance and accessibility, so dense work surfaces get only subtle items (`CLAUDE.md` section 9).

## Alternatives considered

| Option                                                       | Why rejected                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Copying code by hand from the websites                       | No provenance or dependency list, easy to take the wrong variant, and unclear licence terms for Pro items |
| Putting the key in `components.json` or a committed env file | Leaks a paid licence with the repository (R-17)                                                           |
| Free registries only                                         | Loses the Pro blocks for the landing page and the Application UI that `CLAUDE.md` asks for                |
| A packaged component kit (MUI, Ant Design, Chakra UI)        | Rejected in [ADR 0005](0005-web-stack.md): an imposed look and a heavier initial bundle                   |
| A private npm package or Git submodule for Pro code          | Extra publishing and access management for a four-person team, and the code must stay private anyway      |
