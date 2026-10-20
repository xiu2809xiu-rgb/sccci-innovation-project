# HuiTong design system

HuiTong is used every day by busy HR professionals doing data-heavy work. It should feel calm, trustworthy and premium, in the class of Linear or the Stripe dashboard, and never like a template. This document is the contract for every screen: what to use, why, and where it lives in the code. CLAUDE.md section 8 sets the rules; this file explains how the code meets them.

Everything here is implemented in `apps/web`. If a rule and the code disagree, fix one of them in the same pull request.

## 1. Principles

| Principle               | What it means on screen                                                                  | Where it shows                                             |
| ----------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Calm by default         | Neutral warm greys, one accent, motion only where it explains a change                   | Tokens (section 2), motion rules (section 7)               |
| Status first            | The first thing on a page answers "is anything wrong?"                                   | Overview KPIs and sync health, page headers                |
| Recognition over recall | Everything is labelled; nothing depends on remembering codes                             | Translated status names, field labels, role names          |
| Error prevention        | Previews before writes, confirmation for irreversible actions                            | Phase 5 sync preview; confirmation patterns in section 8   |
| Visible governance      | Classification, masking and synthetic-data labels are part of the UI, not hidden in docs | `ClassificationBadge`, `MaskedValue`, `SyntheticDataBadge` |
| Bilingual parity        | English and Simplified Chinese are equal citizens                                        | Section 10                                                 |

Design laws we apply and can cite: visual hierarchy and Gestalt (proximity in KPI cards, common region in `SectionCard`, similarity in status badges); Nielsen's ten heuristics (visibility of system status in the live indicator and sync bars, error recovery in `ErrorState`); Fitts's law (the one primary action per view is large and near the content it acts on); Hick's law (three short navigation groups, progressive disclosure in menus); Jakob's law (sidebar plus top bar, ⌘K palette, uptime-style run bars).

## 2. Colour

All colours are design tokens in [`apps/web/src/styles/tokens.css`](../../apps/web/src/styles/tokens.css), defined in OKLCH. Components use semantic tokens through Tailwind utilities (`bg-card`, `text-muted-foreground`, `border-input`, `text-success`). Raw palette steps (`--neutral-*`, `--jade-*`) exist only to define the semantic tokens; components never use them, and never use hex, `rgb()` or arbitrary colour classes.

### Palette

- **Warm neutral grey (hue 75):** surfaces, text and lines. Slightly warm so long sessions feel softer than pure grey.
- **Deep jade (hue 172):** the one accent, for actions and focus. No purple gradients and no rainbow gradients anywhere.
- **Status colours:** success (green 152), warning (amber 65), danger (red 27), info (blue 250), each with a text colour, a subtle background and a border.

### Semantic tokens

| Token                                                                   | Use                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `--background`                                                          | Page canvas (light: warm off-white; dark: near-black)  |
| `--card`, `--popover`                                                   | Raised surfaces: cards, menus, dialogs                 |
| `--foreground`, `--muted-foreground`, `--subtle-foreground`             | Three text tones: primary, secondary, tertiary         |
| `--muted`, `--accent`                                                   | Quiet backgrounds: tracks, hover states, icon wells    |
| `--primary`, `--primary-hover`, `--primary-foreground`                  | The primary action                                     |
| `--primary-subtle`, `--primary-subtle-foreground`                       | Selected states and counters                           |
| `--border`, `--border-strong`                                           | Decorative lines (cards, dividers)                     |
| `--input`                                                               | Control boundaries; 3:1 against surfaces (WCAG 1.4.11) |
| `--ring`                                                                | The focus ring                                         |
| `--success`, `--warning`, `--danger`, `--info` (+ `-subtle`, `-border`) | Status text, backgrounds and borders                   |
| `--destructive`                                                         | Destructive buttons                                    |
| `--classification-*`                                                    | Data-classification badges (section 9)                 |
| `--chart-1` … `--chart-5`                                               | Charts: jade, slate blue, amber, rose, sage            |
| `--sidebar-*`                                                           | Navigation surfaces                                    |
| `--glass`, `--glass-border`                                             | Translucent panels over the 3D scene only              |

### Contrast is tested, not assumed

[`tokens.test.ts`](../../apps/web/src/styles/tokens.test.ts) parses `tokens.css`, resolves every `var()` chain, converts OKLCH to sRGB luminance and checks 35 pairs per theme (70 checks): text pairs at 4.5:1 or more (WCAG 1.4.3) and control boundaries, focus rings and chart marks at 3:1 or more (WCAG 1.4.11). Changing a token that breaks a pair fails CI.

Light and dark themes share the token names; `.dark` on `<html>` swaps the values. The theme follows the operating system by default and can be pinned in the top bar or Settings. `public/theme-init.js` applies the saved theme before first paint, so there is no flash of the wrong theme.

## 3. Typography

| Family                  | Use                                              | Source                              |
| ----------------------- | ------------------------------------------------ | ----------------------------------- |
| Geist (variable)        | Latin text                                       | `@fontsource-variable/geist`        |
| Noto Sans SC (variable) | Chinese text, as the next font in the same stack | `@fontsource-variable/noto-sans-sc` |
| Geist Mono (variable)   | Trace IDs, codes                                 | `@fontsource-variable/geist-mono`   |

Fonts are self-hosted: Google Fonts is unreachable from mainland China, and a third-party font CDN would weaken the content security policy. Noto Sans SC is split into unicode-range files, so browsers download only the characters a page uses.

### Six sizes, no more

Tailwind's default type scale is reset in [`globals.css`](../../apps/web/src/styles/globals.css), so only these utilities exist. A stray `text-3xl` renders as plain text and shows up in review.

| Utility     | Size | Line height | Use                                   |
| ----------- | ---- | ----------- | ------------------------------------- |
| `text-xs`   | 12px | 16px        | Captions, badges, meta                |
| `text-sm`   | 13px | 20px        | Controls, table cells, secondary text |
| `text-base` | 14px | 22px        | Body text                             |
| `text-md`   | 16px | 24px        | Section titles, lead paragraphs       |
| `text-lg`   | 20px | 28px        | Card and dialog titles                |
| `text-xl`   | 28px | 36px        | Page titles (`h1`) and KPI figures    |

- Weights: 400 for text, 500 for labels, 600 for headings. Headings use `tracking-tight`.
- Numbers in tables and KPIs use tabular numerals (`tabular-nums`; tables get it by default).
- Prose is capped at 60–80 characters, measured in Geist: `max-w-md` for `text-sm` (about 74 characters), `max-w-lg` for `text-base` (78) and `max-w-xl` for `text-md` (77). Not `max-w-prose`: it counts the width of the digit zero, which Geist draws wide, so it lets lines run to about 92 characters.
- Chinese text gets slightly taller line heights at the same size, set under `html:lang(zh-CN)`, because CJK glyphs fill the whole em box. Font size stays the same, so a mixed-language screen keeps one visual rhythm.

## 4. Space and layout

- **8-point grid:** spacing uses even Tailwind steps (`2` = 8px, `4` = 16px, `6` = 24px, `8` = 32px). Odd steps (`1`, `3`) are for icon gaps and hairline adjustments only.
- **Page anatomy:** every page is header, then filters and actions, then content. `PageHeader` renders the first part.
- **Grid:** content uses a 12-column grid on wide screens (`xl:grid-cols-12`), collapsing to two columns on tablets and one on phones.
- **Widths:** content is capped at `--content-max-width` (90rem) with 16px gutters on phones and 32px from `md`.
- **Desktop-first:** fully usable at 1024px and on tablets. The sidebar collapses to an icon rail, and below 768px it becomes a sheet.
- **Fixed chrome:** the top bar is 56px (`--header-height`) and sticky; the sidebar is 16rem, or 3rem collapsed.

## 5. Shape and elevation

- **Two radius families:** controls use 6px (`rounded-md`) and surfaces use 8px (`rounded-lg`, `rounded-xl`). `rounded-sm` (4px) is for tiny chips, and 12px (`rounded-2xl`) is reserved for the landing page. `rounded-full` is for avatars, dots and pills only.
- **Elevation:** four soft, warm shadows (`shadow-xs` to `shadow-lg`). In dark mode, surfaces separate by lightness and borders more than by shadow.
- **Glass:** `bg-glass` with `border-glass-border` and a backdrop blur, only for panels floating over the 3D integration map.

## 6. Iconography

Lucide only (`lucide-react`), never mixed with another set and never emoji. Icons that carry meaning have a text label or `aria-label`; decorative icons get `aria-hidden="true"`. Sizes are 16px in controls and lists (`size-4`) and 14px in dense rows (`size-3.5`).

## 7. Motion

| Kind             | Duration and easing                                                                             | Example                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| UI feedback      | 150–250ms, ease-out (`--duration-fast`, `--duration-base`, `--duration-slow`; `ease-out`)       | Hover backgrounds, menu fades, colour changes   |
| Spatial movement | Springs (Motion or a sampled `linear()` spring)                                                 | Segmented-control thumb, activity rows settling |
| Ambient          | At most 5 s each time it comes into view, then holds still; one per viewport, paused off-screen | The 3D teaser on the sign-in page               |

Rules:

- Motion explains a change (something arrived, moved or finished). Decoration is limited to the landing page.
- Tables and forms never animate while the user is working in them. `DataTable` rows do not animate at all.
- **Reduced motion is respected everywhere,** in two layers. A global CSS rule in `globals.css` cuts every CSS animation and transition to almost zero. Every animated component also branches on `useReducedMotion()` and renders a calm still state: the final number, fully visible text, one still frame of a shader. Each React Bits item's reduced-motion behaviour is listed in [`reactbits-usage.md`](reactbits-usage.md) and covered by its tests.
- Animation loops pause when their element is off-screen or the tab is hidden, and clean up on unmount.
- **Self-started motion stops within five seconds** beside other content (WCAG 2.2.2 Pause, Stop, Hide). Decorative loops either play inside a five-second window each time they come into view (`useAutoplayWindow`, then the last frame stays) or settle on their own (the StarBorder star rests after four seconds). Hover and focus may start them again, because the user asked. Indicators of work still running, such as a sync in progress, are reviewed in the Phase 10 accessibility pass.

## 8. Components

### Primitives: shadcn/ui

Accessible primitives from shadcn/ui (Radix), installed into `src/components/ui/` with the shadcn CLI (`radix-nova` style). They are generated code that we own and have changed where they fell short:

| Change                                                                | Why                                                                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SidebarInset` renders a `<div>`                                      | It rendered `<main>`, which put the top bar inside the main landmark; `AppLayout` renders the only `<main>`      |
| `CommandDialog` keeps its title inside the dialog                     | The sr-only title was rendered in the page even while the palette was closed                                     |
| `Button` and `Badge` hover with `--primary-hover`                     | `bg-primary/80` lowered text contrast on hover                                                                   |
| `Button`/`Toggle` small sizes use `text-sm`                           | Arbitrary `text-[0.8rem]` added an eighth type size                                                              |
| `sonner` follows our theme hook                                       | It depended on `next-themes`, which this Vite app does not use                                                   |
| `InputGroupAddon` no longer focuses the input on click                | Mouse-only behaviour that broke two jsx-a11y rules; keyboard users reach the input directly                      |
| `chart`, `field`, `sidebar`, `progress`, `toggle-group`, `use-mobile` | Strict TypeScript and lint fixes (no `any`, no setState in effects)                                              |
| Every primitive imports `cn` from `@/lib/utils`                       | The configured merge helper knows the custom size `text-md`; the stock one treated it as a colour and dropped it |

### Shared composites: `src/components/common/`

| Composite                                 | Purpose                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PageHeader`                              | Title, purpose, badges and page actions: the top of every page                                            |
| `SectionCard`                             | A titled, labelled region of a page (Gestalt common region)                                               |
| `QueryView`                               | Renders a query's loading, error, empty and success states the same way everywhere                        |
| `DataTable` (+ `DataTablePagination`)     | The one table for server-paginated lists: sortable headers with `aria-sort`, skeleton rows, shared states |
| `EmptyState`                              | Calm placeholder with a next step                                                                         |
| `ErrorState`                              | What went wrong, a retry, and the copyable trace ID                                                       |
| `PermissionDenied`                        | Shown instead of a page the role may not open                                                             |
| `StatusBadge`                             | Labelled status pill with an icon or dot, never colour alone                                              |
| `ClassificationBadge`                     | Data-classification tag with an explanatory tooltip                                                       |
| `MaskedValue`                             | Stands in for a withheld field and answers "why is this hidden"                                           |
| `SyntheticDataBadge`                      | The always-visible "Synthetic demo data" label                                                            |
| `RelativeTime`, `CopyButton`, `BrandMark` | Small shared pieces                                                                                       |
| `PlannedPage`                             | Temporary page for routes built in later phases                                                           |

**Why our own `DataTable` and not TanStack Table:** every list in HuiTong is paginated and sorted on the server (CLAUDE.md requires pagination on every list endpoint). The headless table library's value is in client-side features we do not use, and its v9 API had only just become stable. A small typed component is easier for each area owner to read, explain at the mock interview and extend. If a page later needs column pinning or virtualisation, record an ADR before adding a library.

### Motion and visual components: React Bits

Thirteen React Bits items are installed in `src/components/reactbits/`, each adapted to the tokens, the reduced-motion policy, strict lint rules and accessibility. [`reactbits-usage.md`](reactbits-usage.md) lists every item, where it is used, why, and its reduced-motion behaviour. Vendored sources keep their structure, so they are exempt from the 200-line component guideline; app components are not.

## 9. States every data view handles

| State             | Pattern                                                                 | Component                             |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Loading           | Skeletons shaped like the content; `aria-busy` plus a polite "Loading…" | `QueryView` skeleton, `RouteFallback` |
| Empty             | Says what is missing and offers the next step                           | `EmptyState`, `FirstRunCallout`       |
| Error             | Plain-language message from the error code, retry, copyable trace ID    | `ErrorState`                          |
| Partial data      | A warning line when some sources are unhealthy                          | Overview `partial` banner             |
| Success           | A toast after an action completes                                       | `sonner` through `toast.success`      |
| Permission denied | Replaces the page; the API enforces the same rule                       | `PermissionDenied`                    |

### Governance, risk and sustainability made visible

- **Classification badges:** PUBLIC (neutral), INTERNAL (info), CONFIDENTIAL (warning) and RESTRICTED (danger), each with an icon and a tooltip explaining who may see it.
- **Masked values:** shown as `••••••` with an eye-off icon; the tooltip quotes the reason from the API (role clearance, entity scope, or cross-border transfer not approved).
- **Synthetic data:** labelled in the top bar and on the landing page.
- **Audit and approvals:** records link to their audit trail and approval steps are shown explicitly (Phases 5 and 6). AI suggestions show confidence and "Requires approval".

## 10. Accessibility (WCAG 2.2 AA)

- **Contrast:** tested for both themes (section 2).
- **Focus:** one full-strength 2px ring on every focusable element (`:focus-visible` in `globals.css`); no component removes it.
- **Keyboard:** every control is reachable and operable. There is a skip link, a ⌘K / Ctrl+K palette, roving tab order in segmented controls, and Radix keyboard support in menus and dialogs.
- **Structure:** one `<main>`, a labelled navigation landmark, labelled regions per card, and real headings (`h1` per page). Lists are lists and tables are tables with captions.
- **Announcements:** live regions for loading, copy confirmations, status changes and new live events.
- **Colour is never the only cue:** status badges carry icons or dots; failed sync runs are also shorter bars.
- **Language:** `<html lang>` follows the chosen language, so screen readers switch voice.
- **Motion:** section 7.
- **Automated checks:** axe runs in the Playwright suite (Phase 5 onwards) on top of the token tests.

## 11. Internationalisation

- One JSON file per namespace per language in `src/i18n/locales/{en,zh-CN}/`. The namespaces are common, auth, overview, employees, connectors, integration-map, workflows, attendance-leave, reports, governance, analytics and settings. Each area edits only its own files, which avoids merge conflicts.
- Keys are typed (`src/i18n/i18next.d.ts`): a missing or misspelt key is a compile error.
- [`resources.test.ts`](../../apps/web/src/i18n/resources.test.ts) enforces the same keys, no empty strings and the same `{{variables}}` in both languages.
- Numbers, dates and relative times use `Intl` through `useFormatters()`. Date-only values (hire dates) are formatted in UTC so they never shift a day between Singapore and Shanghai browsers.
- Chinese headlines are split with `Intl.Segmenter`, so animated text wraps between words instead of overflowing.
- Nothing user-facing is hard-coded. Data values (employee names, connector names) come from the API in both languages where they exist.

## 12. Writing style

- Sentence case everywhere; no title case and no shouting.
- Plain words an HR executive would use: "conflict", "source of truth", "sync", "approval".
- Error messages say what happened and what to do next, never the technical cause. The trace ID is offered for support.
- Numbers come with their meaning ("Records consistent", target 98%).

## 13. Adding a page

1. Add the route to `src/app/router.tsx` (lazy, with `handle.crumb` and `handle.requires`) and the navigation entry to `src/app/navigation.ts`.
2. Start with `PageHeader`, then filters and actions, then content in `SectionCard`s on the 12-column grid.
3. Fetch with TanStack Query in `features/<area>/api/`, and render through `QueryView` or `DataTable` so every state is handled.
4. Put strings in your namespace in both languages, and run the parity test.
5. Use at least one React Bits item where it helps, adapted per [`reactbits-usage.md`](reactbits-usage.md), and keep motion subtle on work surfaces.
6. Check keyboard use, both themes, reduced motion and Chinese before opening the pull request; attach screenshots.
