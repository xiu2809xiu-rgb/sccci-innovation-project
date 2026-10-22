// Builds the slide deck (Phase 9): docs/slides/huitong.md, in the theme beside it, exported to HTML,
// PDF and PPTX in docs/slides/dist/. The theme takes the app's own tokens and fonts: the light theme's
// custom properties from tokens.css, and the fonts embedded as data URLs (Geist, and only the Noto
// Sans SC subsets that cover the deck's Chinese), so each export stands on its own.
//
// The exports are committed, so dist/sources.json records what they were built from. `--check`
// builds nothing and needs no browser: it fails when the deck, the theme, the tokens, an image the
// deck shows, this script, or the installed version of Marp or a font has changed since. CI runs it.
//
// Marp renders the PDF and the PPTX in the Chromium that Playwright installs for the e2e tests;
// BROWSER_PATH overrides it. The PPTX holds each slide as an image, with its speaker notes.
// Usage: node scripts/build-slides.mjs [--check]
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SLIDES = join(ROOT, 'docs/slides');
const DIST = join(SLIDES, 'dist');
const DECK = join(SLIDES, 'huitong.md');
const THEME = join(SLIDES, 'theme/huitong.css');
const TOKENS = join(ROOT, 'apps/web/src/styles/tokens.css');
const FONTS = join(ROOT, 'apps/web/node_modules/@fontsource-variable');
const MARP = join(ROOT, 'node_modules/@marp-team/marp-cli');
const MANIFEST = join(DIST, 'sources.json');
const EXPORTS = ['huitong.html', 'huitong.pdf', 'huitong.pptx'];
const CHECK = process.argv.includes('--check');

/** The declarations of the light theme's `:root` block in tokens.css, without its comments. */
function lightTokens() {
  const css = readFileSync(TOKENS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const start = css.indexOf(':root');
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
}

/**
 * Fails when the theme uses a custom property that neither the light theme nor the theme itself
 * defines: a misread tokens.css would otherwise render every slide in fallback colours, silently.
 */
function assertTokens(theme) {
  const defined = new Set(
    [...`${lightTokens()}\n${theme}`.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
  );
  const used = new Set([...theme.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]));
  const missing = [...used].filter((name) => !defined.has(name));
  if (missing.length > 0) {
    throw new Error(`the theme uses ${missing.join(', ')}, which tokens.css does not define`);
  }
}

/** The installed versions the exports depend on: Marp CLI, the renderer it uses, and the fonts. */
function versions() {
  const marp = createRequire(join(realpathSync(MARP), 'package.json'));
  return [
    marp('./package.json').version,
    marp('@marp-team/marp-core/package.json').version,
    marp('@marp-team/marpit/package.json').version,
    ...['geist', 'noto-sans-sc'].map(
      (family) => JSON.parse(readFileSync(join(FONTS, family, 'package.json'), 'utf8')).version,
    ),
  ];
}

/** A font file as a data URL. */
function dataUrl(path) {
  return `url(data:font/woff2;base64,${readFileSync(path).toString('base64')})`;
}

/** Every `@font-face` rule of a Fontsource stylesheet, with its file and its Unicode ranges. */
function fontFaces(family) {
  const css = readFileSync(join(FONTS, family, 'index.css'), 'utf8');
  return [...css.matchAll(/@font-face \{[^}]*\}/g)].map(([rule]) => ({
    rule,
    file: /url\(\.\/files\/([^)]+)\)/.exec(rule)?.[1] ?? '',
    ranges: (/unicode-range:\s*([^;]+);/.exec(rule)?.[1] ?? '').split(',').map((range) => {
      const [low, high = low] = range.trim().replace(/^U\+/i, '').split('-');
      return [Number.parseInt(low, 16), Number.parseInt(high, 16)];
    }),
  }));
}

/** A face with its file inlined. */
function embedded(family, face) {
  return face.rule.replace(
    /url\(\.\/files\/[^)]+\)/,
    dataUrl(join(FONTS, family, 'files', face.file)),
  );
}

/**
 * Geist's Latin faces, and the Noto Sans SC subsets that hold a Chinese character the deck uses: the
 * full font is 4.5 MB in 101 subsets, and a deck needs a handful of them. Symbols Geist lacks, such
 * as → and ≤, are left to the system font, because Noto Sans SC draws them in a CJK style that sits
 * badly in Latin text.
 */
function fontCss(deck) {
  const geist = fontFaces('geist').filter((face) =>
    /geist-latin(-ext)?-wght-normal/.test(face.file),
  );
  const chinese = [...new Set([...deck].map((char) => char.codePointAt(0) ?? 0))].filter(
    (point) => point >= 0x2e80,
  );
  const noto = fontFaces('noto-sans-sc').filter((face) =>
    chinese.some((point) => face.ranges.some(([low, high]) => point >= low && point <= high)),
  );
  return [
    ...geist.map((face) => embedded('geist', face)),
    ...noto.map((face) => embedded('noto-sans-sc', face)),
  ].join('\n');
}

/**
 * The deck as Marp reads it from dist/: each relative path one level deeper, so the HTML export
 * finds the screenshots and diagrams from where it is saved.
 */
function deckForDist(deck) {
  return deck.replace(/(\]\(|src=")\.\.\//g, '$1../../');
}

/** Every image the deck shows, as a path on disk. */
function images(deck) {
  const paths = [...deck.matchAll(/(?:\]\(|src=")(\.\.\/[^)"\s]+)/g)].map((match) => match[1]);
  return [...new Set(paths)].map((path) => join(SLIDES, path));
}

/**
 * What the exports depend on: the deck, the theme and the tokens, every image the deck shows, this
 * script (its Marp options and font choice), and the installed versions of Marp and the fonts.
 */
function fingerprint(deck) {
  const hash = createHash('sha256')
    .update(deck)
    .update(readFileSync(THEME, 'utf8'))
    .update(lightTokens())
    .update(readFileSync(fileURLToPath(import.meta.url)));
  for (const file of images(deck)) {
    if (!existsSync(file)) throw new Error(`the deck shows ${file}, which does not exist`);
    hash.update(readFileSync(file));
  }
  for (const version of versions()) hash.update(version);
  return hash.digest('hex').slice(0, 16);
}

function check(deck) {
  const recorded = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')).huitong : null;
  const problems = EXPORTS.filter((file) => !existsSync(join(DIST, file))).map(
    (file) => `${file} is missing`,
  );
  if (recorded !== fingerprint(deck)) {
    problems.push('the exports were built from an older deck, theme, image or version');
  }
  if (problems.length > 0) {
    console.error(`${problems.join('\n')}\nRun pnpm slides:build and commit docs/slides/dist/.`);
    process.exit(1);
  }
  console.log('the slide exports are current');
}

async function build(deck) {
  const web = createRequire(join(ROOT, 'apps/web/package.json'));
  const { chromium } = web('@playwright/test');
  const browserPath = process.env.BROWSER_PATH ?? chromium.executablePath();
  if (!existsSync(browserPath))
    throw new Error(`no browser at ${browserPath}: install Playwright's Chromium`);
  const { marpCli } = await import('@marp-team/marp-cli');

  // Taken before anything is written, so it records exactly what the exports are built from, and
  // a missing image fails the build before Marp overwrites the old exports.
  const built = fingerprint(deck);
  const theme = readFileSync(THEME, 'utf8').replace('/* @theme huitong */', '');
  assertTokens(theme);
  const work = mkdtempSync(join(tmpdir(), 'huitong-slides-'));
  const themeFile = join(work, 'huitong.css');
  const source = join(DIST, '.huitong.source.md');
  try {
    writeFileSync(
      themeFile,
      `/* @theme huitong */\n${fontCss(deck)}\n:root {${lightTokens()}}\n${theme}`,
    );
    mkdirSync(DIST, { recursive: true });
    writeFileSync(source, deckForDist(deck));
    for (const file of EXPORTS) {
      const status = await marpCli([
        source,
        '--theme-set',
        themeFile,
        '--html',
        '--allow-local-files',
        '--browser',
        'chrome',
        '--browser-path',
        browserPath,
        '--no-stdin',
        ...(file.endsWith('.pdf') ? ['--pdf-notes', '--pdf-outlines'] : []),
        '--output',
        join(DIST, file),
      ]);
      if (status !== 0) throw new Error(`Marp could not build ${file} (exit ${String(status)})`);
    }
  } finally {
    rmSync(source, { force: true });
    rmSync(work, { recursive: true, force: true });
  }
  writeFileSync(MANIFEST, `${JSON.stringify({ huitong: built }, null, 2)}\n`);
}

const deck = readFileSync(DECK, 'utf8');
if (CHECK) check(deck);
else await build(deck);
