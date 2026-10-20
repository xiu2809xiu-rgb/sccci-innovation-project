# React Bits usage

CLAUDE.md section 9 asks us to use React Bits extensively wherever it fits, and to make every item look native. This file is the register: each item, where it is used, why, and what it does when the user prefers reduced motion. Update it in the same pull request that adds, moves or deletes an item.

## Sources

| Source                               | Registry                                                                                      | Status (20 Oct 2026)                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Bits (free)                    | `@react-bits/<Name>-TS-TW` from reactbits.dev                                                 | In use                                                                                                                                                                                                                                                                   |
| Magic UI                             | `@magicui/<name>`                                                                             | Reachable; planned items below                                                                                                                                                                                                                                           |
| React Bits Pro components and blocks | `@reactbits-starter/*`, `@reactbits-pro/*` through `proxy.collectui.pro` with the licence key | **Blocked from this network:** the TLS handshake to `proxy.collectui.pro` is reset (`schannel: failed to receive handshake, SSL/TLS connection failed`). It worked during Phase 2. Pro blocks are planned below and will be installed when the proxy is reachable again. |

Install command (run in `apps/web`, always the TypeScript + Tailwind variant):

```bash
npx shadcn@4.22.0 add @react-bits/CountUp-TS-TW --path src/components/reactbits
```

Then rename the file to kebab-case and apply the adaptation checklist.

## Adaptation checklist (every item)

1. **Header comment:** the origin (registry item and licence) and one line on what was adapted.
2. **Named export** of the component and its props interface; no default export.
3. **Design tokens only:** colour defaults are tokens (`var(--primary)`); canvas and WebGL effects read tokens through `readTokenColor`, `cssColorToRgb` or `useTokenColor`, and follow theme changes. No hex or `rgb()` literals, no arbitrary text sizes, radius from the two families.
4. **Reduced motion:** branch on `useReducedMotion()` from `motion/react` and render a calm still state. Record the behaviour in the table below.
5. **No hard-coded copy:** visible text and accessible names come in as props, translated by the caller.
6. **Accessibility:** correct roles and keyboard support for interactive items; decorative visuals are `aria-hidden`; the global focus ring is never removed.
7. **Performance:** loops pause off-screen or in a hidden tab, and clean up on unmount.
8. **CSP:** no runtime `<style>` elements; keyframes go in a co-located `.css` file (for example `lattice-loader.css`).
9. **Strict lint and types,** and a test that covers the reduced-motion state.

## Items in use

| Item          | File                 | Where                                             | Why                                                                                                                             | Reduced motion                                              |
| ------------- | -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Aurora        | `aurora.tsx`         | Landing page background                           | One faint ambient effect gives the signed-out page depth without competing with the copy; jade and slate-blue tokens, no purple | One still frame of the aurora                               |
| ShinyText     | `shiny-text.tsx`     | Landing eyebrow ("HR integration layer")          | Draws the eye to the category line once, then rests                                                                             | Static text in its resting colour                           |
| BlurText      | `blur-text.tsx`      | Landing headline (`h1`)                           | The headline resolves word by word (letter by letter in Chinese) on load: a single, purposeful entrance                         | Plain text, fully visible at once                           |
| SpotlightCard | `spotlight-card.tsx` | Landing sign-in panel; Overview KPI cards         | A soft light follows the pointer or keyboard focus, so the card under attention is clear without borders shouting               | The light follows instantly; no easing and no ambient drift |
| StarBorder    | `star-border.tsx`    | Landing "Sign in" button                          | The page's single primary action gets a quiet travelling highlight (Fitts's law and visual hierarchy)                           | One still frame of the star on the border                   |
| CountUp       | `count-up.tsx`       | Overview KPI figures                              | Numbers counting up signal "fresh data" when the overview loads; screen readers always get the final value                      | The final value, shown at once as plain text                |
| StatusMark    | `status-mark.tsx`    | Overview sync health, while a sync runs           | A small running indicator next to the connector being synced                                                                    | A still frame; the status text is still announced           |
| AnimatedList  | `animated-list.tsx`  | Overview recent activity                          | New events spring into the feed as they arrive on the live stream (adapted from a selectable listbox to a read-only `<ul>`)     | Rows appear at rest with no movement                        |
| FadeContent   | `fade-content.tsx`   | Overview content on first load; placeholder pages | Panels settle in together after the skeleton instead of popping one by one                                                      | Content fully visible, no fade                              |
| LatticeLoader | `lattice-loader.tsx` | Notifications popover, live-update status         | Shows the live stream reconnecting, then a done state when connected                                                            | A still grid; the status text is still announced            |
| RubberSegment | `rubber-segment.tsx` | Settings: language and theme                      | A segmented control (radio group) whose thumb travels between options                                                           | The thumb jumps with no stretch or squash                   |
| SquishSwitch  | `squish-switch.tsx`  | Settings: analytics consent                       | A `role="switch"` toggle with tactile feedback; disabled and explained when the browser sends Global Privacy Control            | The thumb jumps; no swell or stretch                        |
| FuzzyText     | `fuzzy-text.tsx`     | 404 page illustration                             | A decorative "404" that fuzzes under the pointer; the real heading says "Page not found"                                        | One crisp still frame                                       |

Every item has a test in `src/components/reactbits/*.test.tsx`, covering the reduced-motion state and, for interactive items, the keyboard.

## Evaluated and removed

| Item        | Why it was removed                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WarmTooltip | The shadcn `TooltipProvider` already opens the first tooltip after a delay and its siblings instantly (Radix `skipDelayDuration`), with full accessibility |
| GlideSelect | A Radix `DropdownMenu` radio group serves the role switcher with better keyboard and screen-reader support                                                 |

## Planned items (Phases 5 to 7)

Together with the thirteen in use, these bring the app to more than twenty distinct items, with at least one on every page.

| Item                                       | Source                   | Page                                    | Why                                                                 |
| ------------------------------------------ | ------------------------ | --------------------------------------- | ------------------------------------------------------------------- |
| Stepper                                    | React Bits               | Connectors, AI mapping wizard           | Upload, AI proposal, review and approve, as explicit steps          |
| ThoughtLine                                | React Bits               | Connectors, mapping proposal            | Shows the AI's rationale for each proposed mapping                  |
| CallChip                                   | React Bits               | Connectors, mapping proposal            | A live chip while the AI call runs, ending in its outcome           |
| HoldButton                                 | React Bits               | Employees, conflict resolution          | Hold-to-confirm for choosing the source of truth (error prevention) |
| SlideCommit                                | React Bits               | Employees, sync preview                 | Slide to apply a previewed sync write                               |
| Counter                                    | React Bits               | Attendance and leave, consolidation run | An odometer of records processed                                    |
| GlassSurface                               | React Bits               | Integration map                         | Glass panels over the 3D scene (the one place glass is allowed)     |
| Animated Beam                              | Magic UI                 | Connector detail                        | Source fields flowing into canonical fields                         |
| `hero-33`, `auth-4`                        | React Bits Pro (blocked) | Landing                                 | The integration-platform hero and an orbital sign-in layout         |
| `integrations-6`, `agent-approval-2`       | React Bits Pro (blocked) | Connectors                              | Per-source sync progress; approval dialog with a diff               |
| `kanban-1`                                 | React Bits Pro (blocked) | Workflows (area 2)                      | The manpower-to-onboarding pipeline board                           |
| `ai-usage-1`, `ai-usage-7`, `monitoring-6` | React Bits Pro (blocked) | Analytics (area 4)                      | Token usage chart, request log and uptime grid                      |

## Coverage by page

| Page                                                                                                    | Items                                                                                |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Landing and sign-in                                                                                     | Aurora, ShinyText, BlurText, SpotlightCard, StarBorder                               |
| Overview                                                                                                | CountUp, SpotlightCard, StatusMark, AnimatedList, FadeContent                        |
| Settings                                                                                                | RubberSegment, SquishSwitch                                                          |
| 404                                                                                                     | FuzzyText                                                                            |
| App shell                                                                                               | LatticeLoader (notifications)                                                        |
| Employees, Connectors, Integration map, Workflows, Attendance and leave, Reports, Governance, Analytics | FadeContent now (placeholder pages); the planned items above when each page is built |
