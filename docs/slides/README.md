# Slides

The deck for the W5 proposal presentation, written in [Marp](https://marp.app/) and set in the app's own design tokens and fonts. The W13 technical review and the W18 final presentation build on it.

| Path                                     | What it is                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| [`huitong.md`](huitong.md)               | The deck: 13 slides, each with its speaker notes in the HTML comment at its end |
| [`theme/huitong.css`](theme/huitong.css) | The theme: the app's colour tokens and fonts, seven type sizes, an 8-point grid |
| [`dist/huitong.pdf`](dist/huitong.pdf)   | Every slide as a page, with the notes as PDF annotations and an outline         |
| [`dist/huitong.html`](dist/huitong.html) | The deck in a browser, with the presenter view and the notes                    |
| [`dist/huitong.pptx`](dist/huitong.pptx) | Each slide as an image with its notes, to present from PowerPoint               |
| [`dist/sources.json`](dist/sources.json) | What the exports were built from                                                |

## Present it

- **From a browser.** Open `dist/huitong.html` from a clone of the repository: it reads the screenshots and diagrams from `docs/`. Press `p` for the presenter view, with the notes and the next slide, `o` for an overview of every slide and `f` for full screen.
- **From PowerPoint or a PDF reader.** Use `dist/huitong.pptx` or `dist/huitong.pdf`. Both hold the slides as rendered, so change the deck in `huitong.md`, never in PowerPoint.

The notes give what to say on each slide and what to be honest about: what is built, what is designed, and that every system outside HuiTong is a mock. Where an area's owner presents, the notes say so.

## Change it

1. **Edit [`huitong.md`](huitong.md).** Keep one idea per slide and the speaker notes current. Every claim must be true of the repository: say "designed" or "planned" for what is not built yet.
2. **Use the theme's classes**, not inline styles: `kicker`, `note`, `fill`, `split`, `shots` (with `rows`), `crop`, `kpis`, `steps`, `tag built`, `timeline` (with `weeks`) and `cards`, and the slide classes `lead` and `diagram`. Each is described where [`theme/huitong.css`](theme/huitong.css) defines it. Keep to its seven type sizes, the most CLAUDE.md allows.
3. **Show the product, not mock-ups.** Screenshots come from [`docs/design/screenshots/`](../design/screenshots/README.md) and diagrams from [`docs/diagrams/`](../diagrams/README.md). To show part of a screenshot, wrap it in `<div class="crop" style="--left: 553; --top: 320; --width: 887; --height: 570">`, giving the region in the screenshot's own pixels (the screenshots are 1440 by 900).
4. **Build and look.** Run `pnpm slides:build`, then check every slide, for example in the HTML's overview.
5. **Commit the source and `dist/` together.** `pnpm slides:check`, which CI runs, fails when the deck, the theme, the tokens, an image the deck shows, the build script, or the installed version of Marp or a font has changed since the exports were built.

## How the build works

`pnpm slides:build` runs [`build-slides.mjs`](../../scripts/build-slides.mjs). It writes a temporary theme that puts the light theme's tokens from `apps/web/src/styles/tokens.css` in front of `theme/huitong.css`, so every colour in the theme is a token (the build fails if the theme names one that does not exist), and it embeds the fonts: Geist's Latin faces, and only the Noto Sans SC subsets that hold the deck's Chinese characters. Marp CLI then renders the three exports in the Chromium that Playwright installs for the e2e tests (`pnpm --filter @huitong/web exec playwright install chromium`); `BROWSER_PATH` names another Chromium or Chrome.
