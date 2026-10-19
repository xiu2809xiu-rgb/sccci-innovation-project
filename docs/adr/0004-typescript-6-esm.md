# ADR 0004: TypeScript 6.0 in strict mode with ESM everywhere

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M4

## Context

[`CLAUDE.md`](../../CLAUDE.md) requires TypeScript in strict mode everywhere, no `any`, and the latest stable versions, pinned exactly. In October 2026 there are two current TypeScript lines:

- **6.0.3**, the last release of the JavaScript-based compiler. It is designed as the bridge to 7.0: it deprecates what 7.0 removes.
- **7.0.2**, the native port written in Go, which typechecks much faster.

Two tools that embed the compiler constrain the choice:

- **typescript-eslint 8.71** declares support for TypeScript below 6.1. Its type-aware rules, which are how we enforce "no `any`" and catch unhandled promises, run the compiler's API in-process. TypeScript 7 publishes its programmatic API only under `unstable/*` entry points.
- **@nestjs/cli 12** depends on TypeScript `~6.0`.

The module format is effectively decided for us. NestJS 12 and Prisma 7 ship as ESM only, so the API must be ESM. The web build (Vite) is ESM already, and Node.js 24 runs ESM natively.

## Decision

**1. TypeScript 6.0.3, pinned in every package.**

- `strict: true` is set in the shared base config `@huitong/tsconfig`. Packages extend it and may add checks but never relax them.
- Lint treats `@typescript-eslint/no-explicit-any` as an error and enables the type-aware rules that catch unsafe `any` flows and floating promises.
- Deprecation warnings are fixed, not silenced: no package sets `ignoreDeprecations`. A clean 6.0 build is the best preparation for 7.0.

**2. ESM everywhere.**

- Every `package.json` declares `"type": "module"`.
- Node packages (`apps/api`, `services/*`, `packages/shared`) compile with `module` and `moduleResolution` set to `nodenext`. Relative imports carry the runtime extension: a `.ts` file imports `./employee.js`, and the compiler reports a missing extension as an error.
- `apps/web` uses Vite's `bundler` resolution, extensionless imports and the `@/` alias.
- `@huitong/shared` is imported by both, so it follows the stricter Node rules and is compiled to JavaScript with type declarations ([ADR 0003](0003-pnpm-workspaces-monorepo.md)).
- The API keeps `experimentalDecorators` and `emitDecoratorMetadata`, which NestJS dependency injection needs.

**3. When to revisit TypeScript 7.** We move once all of these hold:

- typescript-eslint has a stable release that supports TypeScript 7's API;
- the tool that builds the API (today @nestjs/cli) supports TypeScript 7;
- a trial branch on TypeScript 7 passes `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.

The move is then recorded in a new ADR that supersedes this one.

## Consequences

### Positive

- One module system across the repository, so there are no CommonJS/ESM interop surprises or dual-package hazards. Top-level `await` is available in scripts such as the seed.
- Type-aware linting stays. That is how "no `any`" is enforced rather than hoped for.
- Every tool in the chain (Nest CLI, typescript-eslint, Vite, Vitest) supports these versions today.

### Negative

- Typechecking is slower than it would be on TypeScript 7. That is acceptable at our size, but the cost grows with the codebase.
- `.js` extensions on imports of `.ts` files surprise newcomers. The compiler error makes the mistake obvious.
- ESM has no `__dirname` or `require`. Code uses `import.meta.dirname` and `import.meta.filename`, and `createRequire` for the rare CommonJS-only package.
- Some CommonJS libraries offer only a default export under ESM, so named imports from them fail at runtime. New dependencies are checked for ESM support before they are added.
- ESM-only shapes other decisions: Jest is ruled out ([ADR 0012](0012-testing-strategy.md)), and OpenTelemetry auto-instrumentation needs a module hook at start-up ([ADR 0016](0016-observability-baseline.md)).

## Alternatives considered

| Option                                                                               | Why rejected                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript 7.0.2 now                                                                 | Much faster typechecks, but typescript-eslint 8.71 and @nestjs/cli 12 do not support it. We would lose the type-aware lint rules, our main guard against `any` |
| TypeScript 6 for tooling plus TypeScript 7 for fast typechecks                       | Two compilers can disagree, and the team would have to understand both. Worth considering only once 7 is the target                                            |
| CommonJS for the API (the traditional Nest set-up)                                   | Not available: NestJS 12 and Prisma 7 are ESM only                                                                                                             |
| Bundler-style resolution in Node packages, bundling the API with a tool such as tsup | Hides Node's real resolution rules during development, adds a build tool, and makes Nest's decorator metadata and Prisma's generated client harder to debug    |
| Gradual strictness                                                                   | Not allowed by `CLAUDE.md`, and turning strict on later costs more than starting strict                                                                        |
