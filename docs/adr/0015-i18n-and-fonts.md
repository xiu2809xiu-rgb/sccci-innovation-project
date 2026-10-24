# ADR 0015: Runtime bilingual UI with namespaced translations and self-hosted fonts

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M1, M2, M4 · capabilities A–G (every screen)

## Context

HuiTong's users work in two languages: Singapore HR mostly in English and HQ HR mostly in 中文 ([problem statement 2.4, as written for statement #7](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/archive/ps7-lesso-solar/docs/problem-statement.md#24-constraints)). `CLAUDE.md` requires:

- a bilingual UI (English and 简体中文), switchable at runtime, with no hard-coded user-facing strings;
- Geist for Latin text and Noto Sans SC for Chinese, with matched sizing and tabular numerals in tables and KPIs.

Three problems:

- **Merge conflicts.** The `CLAUDE.md` layout shows one `en.json` and one `zh-CN.json`. Four owners adding keys to the same two files on parallel branches would conflict in almost every pull request.
- **Reachability from mainland China.** Google Fonts and other Google services are unreachable or unreliable for HQ users, and a third-party font CDN would force the CSP to allow other origins ([R-15](../grs/grs-by-design.md#32-register)).
- **CJK font size.** A complete Noto Sans SC font runs to several megabytes per weight, far too much for the login page.

## Decision

**1. react-i18next for runtime switching.** i18next 26 and react-i18next 17, with the languages `en` and `zh-CN`. The top-bar toggle switches language without a reload. The choice is remembered per viewer, falling back to the browser's language and then to English, and `<html lang>` follows it for screen readers and font selection.

**2. Namespaced files, a deviation from the `CLAUDE.md` layout.** One JSON file per namespace per language:

```text
apps/web/src/i18n/locales/
  en/      common.json  auth.json  employees.json  workflows.json  ...
  zh-CN/   common.json  auth.json  employees.json  workflows.json  ...
```

The namespaces are `common`, `auth`, `overview`, `employees`, `connectors`, `integrationMap`, `workflows`, `attendanceLeave`, `reports`, `governance`, `analytics` and `settings`. Each belongs to one area ([module ownership](../team/module-ownership.md)), and `common` follows the shared-files protocol. A feature's namespace loads with its route; `common` loads at start-up.

**3. Guards against drift.**

- A key-parity test fails when a namespace's keys differ between `en` and `zh-CN`, when a value is empty, or when interpolation placeholders differ. Plural keys are compared after normalising their suffixes, because English uses `_one` and `_other` while Chinese uses only `_other`.
- Keys are typed from the English files through i18next's `CustomTypeOptions`, so a mistyped key fails `pnpm typecheck`.
- The API sends codes, not prose. Error codes and validation issues are translation keys ([ADR 0009](0009-shared-zod-contracts.md)), and bilingual reference data, such as department and leave-category names (人力资源部 / Human Resources), comes from the API.
- Dates, numbers and currencies are formatted with `Intl` for the active locale.

**4. Self-hosted fonts through Fontsource.** Geist, Geist Mono and Noto Sans SC come from Fontsource npm packages and are served from our own origin, so the CSP keeps `font-src 'self'`.

- The font stack puts Geist first and Noto Sans SC second. Latin letters and all digits render in Geist, and Chinese characters fall through to Noto Sans SC, so mixed text such as "Zhou Xinyi 周欣怡" uses both.
- Fontsource splits Noto Sans SC into unicode-range slices, so a page downloads only the slices for the characters it shows.
- Tabular numerals (`font-variant-numeric: tabular-nums`) come from Geist in both languages. Line height and spacing for `:lang(zh-CN)` are design tokens, defined in `docs/design/design-system.md` (Phase 4).
- Both families are licensed under the SIL Open Font License 1.1, which allows bundling and self-hosting.

## Consequences

### Positive

- Owners add strings in their own files, so translation changes rarely conflict.
- Missing translations and mistyped keys fail CI instead of showing up as raw keys on screen.
- HQ users in mainland China load the app with no external requests, and the CSP stays strict.
- Switching language is instant and keeps the user's place.

### Negative

- Many small files. Contributors must choose the right namespace, and a key that several areas need moves to `common`.
- Every string needs both languages in the same PR. Machine translation is accepted only after review by a fluent speaker.
- Self-hosted fonts are ours to keep up to date.
- Text with characters not yet loaded, such as an uncommon name, triggers another slice download.

## Alternatives considered

| Option                                                      | Why rejected                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| One `en.json` and one `zh-CN.json` (the `CLAUDE.md` layout) | Constant merge conflicts between four owners, and no way to load strings per route                                              |
| Translation files inside each feature folder                | Also avoids conflicts, but scatters translations across the tree, which makes translator review and the parity test harder      |
| Google Fonts or another font CDN                            | Unreachable or slow from mainland China, and adds third-party origins to the CSP                                                |
| System fonts only (PingFang SC, Microsoft YaHei)            | No download, but rendering differs by operating system and the Geist look and figures are lost. They stay in the fallback stack |
| FormatJS (react-intl) or Lingui                             | Strong ICU message support, but `CLAUDE.md` fixes react-i18next, which can add ICU formatting later through a plugin            |

## Amendment, 21 Oct 2026: areas 2 to 4 load their namespaces with their routes

Every namespace was bundled into the entry chunk, so the first render always had its strings. Phase 5 noted that this could not last. As areas 2 to 4 fill their namespaces, their strings land in the initial JS, which has a 250 KB budget: area 2's workflow strings alone took it from 226.6 KB to 231.1 KB gzip.

- **Bundled:** the shell's and area 1's namespaces (`common`, `auth`, `overview`, `employees`, `connectors`, `integrationMap`, `settings`), in [`bundled-resources.ts`](../../apps/web/src/i18n/bundled-resources.ts). Every session needs them at first paint.
- **Loaded with their routes:** `workflows`, `attendanceLeave`, `reports`, `governance` and `analytics`, through a small i18next backend in [`lazy-namespaces.ts`](../../apps/web/src/i18n/lazy-namespaces.ts). Each file and language is its own chunk, fetched by dynamic import when a page first asks for it, and again for the new language when the language changes. The component suspends inside the route's Suspense boundary meanwhile, so no untranslated key ever shows.
- **Unchanged:** the full catalogue, [`resources.ts`](../../apps/web/src/i18n/resources.ts), still types every key and feeds the parity test. A new test checks that each namespace is either bundled or lazy, never both. No dependency is added; `i18next-resources-to-backend` would do the same in a package.

A new area namespace goes into `LAZY_NAMESPACES`, unless the shell needs it at first paint.

## Amendment, 24 Oct 2026: statement #5

Under statement #5 ([ADR 0023](0023-retarget-ps5-aspri-ipi.md)) English and 中文 stay until the briefing call confirms which languages ASPRI-IPI's staff need. The users the context above describes are statement #7's.
