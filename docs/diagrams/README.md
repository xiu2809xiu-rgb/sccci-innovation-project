# Diagrams

The sources of the architecture diagrams, each rendered to the SVG beside it. They are explained in [`docs/architecture/README.md`](../architecture/README.md).

- **Change a diagram** by editing its `.mmd` file, then run `pnpm diagrams:build` and commit the source and the SVG together.
- **Do not edit `er-*.mmd`.** They are generated from [`schema.prisma`](../../apps/api/prisma/schema.prisma), one per section of the schema, so a schema change is followed by `pnpm diagrams:build`.
- **Colours come from classes,** not hex values: `person`, `system`, `container`, `store`, `external`, `mock`, `planned`, `control`, `cloud` and `boundary`. [`build-diagrams.mjs`](../../scripts/build-diagrams.mjs) fills them in from the design tokens.
- **`sources.json`** records what each SVG was rendered from. `pnpm diagrams:check`, which CI runs, fails when an ER diagram no longer matches the schema or an SVG is older than its source.
- **A build renders only what changed.** Mermaid does not lay out an ER diagram the same way twice, so re-rendering an unchanged diagram would only churn its SVG. `pnpm diagrams:build --force` renders every diagram, for example after a Mermaid upgrade.

The build drives the Chromium that Playwright installs for the e2e tests (`pnpm --filter @huitong/web exec playwright install chromium`), or the browser named in `PUPPETEER_EXECUTABLE_PATH`.
