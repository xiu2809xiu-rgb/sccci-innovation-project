# ADR 0005: React 19 single-page web stack on Vite 8, Tailwind CSS 4 and shadcn/ui

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M2, M4

## Context

The users are busy HR professionals in Singapore and Shanghai who do data-heavy work every day. [`CLAUDE.md`](../../CLAUDE.md) section 8 asks for a calm, trustworthy, premium product, and the web app has to deliver:

- dense tables, filters and forms;
- a runtime switch between English and 简体中文, and light and dark themes;
- WCAG 2.2 AA accessibility, and GRS controls visible in the UI (masking, classification badges, approval steps);
- a 3D integration map, and extensive use of React Bits (section 9);
- performance budgets: initial JS ≤ 250 KB gzip (excluding the lazy 3D chunk), LCP < 2.5 s, and Lighthouse ≥ 90.

It is an authenticated internal tool, so search engines never see it. It is served from the same origin as the API, behind a proxy.

## Decision

We will build a **client-rendered single-page application**:

| Concern                      | Choice                                                                    | Notes                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI library                   | React 19.3                                                                | Held below 19.4 because React Three Fiber 9 caps its React peer range there                                                                                        |
| Build and dev server         | Vite 8 (Rolldown)                                                         | The dev server (port 5173) proxies `/api` and `/health`, so development is same-origin, as in Docker                                                               |
| Styling                      | Tailwind CSS 4.3                                                          | CSS-first configuration. Colour, radius, spacing, shadow and motion values come only from `styles/tokens.css`                                                      |
| Primitives                   | shadcn/ui through shadcn CLI 4, on Radix                                  | Source is copied into `components/ui` and owned by us. Radix supplies focus management, keyboard support and ARIA                                                  |
| Visual and motion components | React Bits (free and Pro), Magic UI                                       | Installed through shadcn registries and adapted to our tokens ([ADR 0017](0017-ui-component-registries.md))                                                        |
| Icons                        | Lucide                                                                    | The only icon set                                                                                                                                                  |
| Routing                      | React Router 8, data mode                                                 | `createBrowserRouter` from `react-router` and `RouterProvider` from `react-router/dom`. Every route is lazy. The `react-router-dom` package no longer exists in v8 |
| Server state                 | TanStack Query 5                                                          | Caching, retries and invalidation. Query hooks live in each feature's `api/` folder                                                                                |
| Client state                 | Zustand 5                                                                 | Only what the server does not own: theme preference, sidebar and command-palette state, analytics consent                                                          |
| Forms                        | React Hook Form 7 + zod 4 (@hookform/resolvers 5.9)                       | Uses the same schemas as the API ([ADR 0009](0009-shared-zod-contracts.md))                                                                                        |
| i18n                         | i18next 26 + react-i18next 17                                             | See [ADR 0015](0015-i18n-and-fonts.md)                                                                                                                             |
| Charts                       | Recharts 3                                                                | Loaded lazily with the pages that use them                                                                                                                         |
| Motion                       | Motion 14                                                                 | 150–250 ms ease-out for UI, springs for spatial movement, and reduced motion honoured globally                                                                     |
| 3D                           | three 0.186, @react-three/fiber 9, drei 10, @react-three/postprocessing 3 | A separate lazy chunk, outside the 250 KB budget                                                                                                                   |

**Why data mode.**

- Each route's `lazy` gives code splitting per page without hand-written `React.lazy` boundaries.
- Route error boundaries render the error state, with retry and `traceId`.
- `useBlocker` can stop someone navigating away from unsaved mapping edits (error prevention).

Framework mode is not used, because we need neither server rendering nor file-based routing.

## Consequences

### Positive

- The build output is static files: nginx serves them locally, and S3 + CloudFront serve them on AWS. There is no Node server for the web.
- Because we own the component source, items can be adapted to our tokens and accessibility rules instead of being overridden.
- Route-level splitting, plus lazy charts and 3D, keeps the initial bundle within budget.
- The state rule is simple: server data lives in TanStack Query, and the little that remains lives in Zustand. No global store duplicates server data.

### Negative

- That is many libraries for four students to learn. Every feature owner must at least understand Router, Query, forms and i18n.
- Versions are coupled. R3F 9 holds React at 19.3, and React Bits and Magic UI items target particular React, Tailwind and Motion versions, so some need adapting.
- Copied shadcn and registry code has no `npm update` path. An upgrade means adding the item again and reviewing the diff.
- The page is blank until the JavaScript loads. The login page must stay light to meet LCP < 2.5 s, so its 3D teaser loads after first paint.
- Motion-heavy components hurt performance and accessibility if overused. `CLAUDE.md` limits dense work surfaces to subtle items.

## Alternatives considered

| Option                                  | Why rejected                                                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js (App Router, server components) | Server rendering and SEO bring nothing to an authenticated internal tool. It adds a Node server to deploy and secure, and server components complicate the shadcn set-up (`rsc: false`) |
| React Router framework mode             | The same server-rendering trade-off; data mode keeps a plain SPA                                                                                                                        |
| Ant Design or MUI                       | Ant Design's zh-CN support and data-dense tables are a real loss. But both impose a recognisable look that fights our tokens, and both add weight to the initial bundle                 |
| Redux Toolkit                           | Server state already lives in TanStack Query, and the remaining client state is too small to justify it                                                                                 |
| Apache ECharts                          | Very capable and widely used in China, but heavier and canvas-first. Recharts renders SVG that follows our tokens and is easier to make accessible                                      |
