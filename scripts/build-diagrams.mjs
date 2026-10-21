// Builds the architecture diagrams (Phase 8). Each docs/diagrams/*.mmd is rendered to an SVG beside
// it with Mermaid CLI, coloured from the design tokens and set in the app's own font (Geist, embedded
// in the SVG), so the diagrams look the same on GitHub, in the docs and on the slides. The ER diagrams
// are generated from apps/api/prisma/schema.prisma first, one per section of the schema, so they
// cannot drift from it.
//
// `--check` renders nothing and needs no browser: it fails when an ER diagram no longer matches the
// schema, or an SVG was rendered from an older source or palette. CI runs it.
//
// Rendering drives the Chromium that Playwright installs for the e2e tests (Puppeteer's own browser
// download is disabled in pnpm-workspace.yaml); PUPPETEER_EXECUTABLE_PATH overrides it.
// Usage: node scripts/build-diagrams.mjs [--check]
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIAGRAMS = join(ROOT, 'docs/diagrams');
const SCHEMA = join(ROOT, 'apps/api/prisma/schema.prisma');
const TOKENS = join(ROOT, 'apps/web/src/styles/tokens.css');
const GEIST = join(ROOT, 'apps/web/node_modules/@fontsource-variable/geist');
const MANIFEST = join(DIAGRAMS, 'sources.json');
const CHECK = process.argv.includes('--check');

// --- Palette: the light theme's tokens -------------------------------------

/** The light theme's custom properties (the first `:root` block), with `var()` references resolved. */
function readTokens() {
  const css = readFileSync(TOKENS, 'utf8');
  const start = css.indexOf(':root');
  const block = css.slice(start, css.indexOf('}', start));
  const values = new Map(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
  return (name) => {
    let value = values.get(name);
    while (value?.startsWith('var(--')) value = values.get(value.slice(6, -1));
    if (value === undefined) throw new Error(`token --${name} not found in tokens.css`);
    return value;
  };
}

/** An `oklch(L C h)` token as sRGB hex: Mermaid's colour maths reads hex, not OKLCH. */
function oklchToHex(value) {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value);
  if (!match) throw new Error(`not an opaque oklch colour: ${value}`);
  const [lightness, chroma, hue] = match.slice(1).map(Number);
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const channels = linear.map((channel) => {
    const clamped = Math.min(1, Math.max(0, channel));
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

const token = readTokens();
const hex = (name) => oklchToHex(token(name));
const PALETTE = {
  surface: hex('neutral-0'),
  canvas: hex('neutral-25'),
  muted: hex('neutral-100'),
  border: hex('neutral-300'),
  line: hex('neutral-500'),
  subtle: hex('neutral-600'),
  text: hex('neutral-900'),
  primary: hex('jade-600'),
  primarySoft: hex('jade-50'),
  primaryMid: hex('jade-100'),
  primaryDeep: hex('jade-800'),
  warningSoft: hex('warning-subtle'),
  warningBorder: hex('warning-border'),
  infoSoft: hex('info-subtle'),
  infoBorder: hex('info-border'),
};

const FONT = '"Geist Variable", Arial, sans-serif';

/** Mermaid's configuration: the `base` theme with the token palette, and plain SVG text labels. */
const MERMAID_CONFIG = {
  theme: 'base',
  fontFamily: FONT,
  htmlLabels: false,
  themeVariables: {
    fontFamily: FONT,
    fontSize: '14px',
    background: PALETTE.surface,
    primaryColor: PALETTE.primarySoft,
    primaryBorderColor: PALETTE.primary,
    primaryTextColor: PALETTE.text,
    secondaryColor: PALETTE.muted,
    secondaryBorderColor: PALETTE.border,
    secondaryTextColor: PALETTE.text,
    tertiaryColor: PALETTE.canvas,
    tertiaryBorderColor: PALETTE.border,
    tertiaryTextColor: PALETTE.text,
    lineColor: PALETTE.line,
    textColor: PALETTE.text,
    clusterBkg: PALETTE.canvas,
    clusterBorder: PALETTE.border,
    edgeLabelBackground: PALETTE.surface,
    noteBkgColor: PALETTE.warningSoft,
    noteBorderColor: PALETTE.warningBorder,
    noteTextColor: PALETTE.text,
    actorBkg: PALETTE.primarySoft,
    actorBorder: PALETTE.primary,
    actorTextColor: PALETTE.text,
    actorLineColor: PALETTE.border,
    signalColor: PALETTE.subtle,
    signalTextColor: PALETTE.text,
    labelBoxBkgColor: PALETTE.primarySoft,
    labelBoxBorderColor: PALETTE.primary,
    labelTextColor: PALETTE.text,
    loopTextColor: PALETTE.text,
    activationBkgColor: PALETTE.primaryMid,
    activationBorderColor: PALETTE.primary,
    sequenceNumberColor: PALETTE.surface,
  },
  flowchart: {
    htmlLabels: false,
    curve: 'basis',
    padding: 14,
    nodeSpacing: 36,
    rankSpacing: 52,
    wrappingWidth: 240,
  },
  sequence: {
    mirrorActors: false,
    showSequenceNumbers: true,
    wrap: true,
    width: 170,
    actorMargin: 44,
    messageMargin: 30,
  },
  er: { layoutDirection: 'TB', entityPadding: 14, fontSize: 13 },
};

/**
 * The classes the flowchart sources name, so the sources carry no colours of their own. A person
 * or the system in context, a container of HuiTong, a store, a system outside it, a mock standing
 * in for one, work that is designed but not built, a GRS control, and a trust boundary.
 */
const CLASS_DEFS = [
  `classDef person fill:${PALETTE.primarySoft},stroke:${PALETTE.primary},color:${PALETTE.text},stroke-width:1.5px`,
  `classDef system fill:${PALETTE.primary},stroke:${PALETTE.primaryDeep},color:${PALETTE.surface},stroke-width:1.5px`,
  `classDef container fill:${PALETTE.primarySoft},stroke:${PALETTE.primary},color:${PALETTE.text}`,
  `classDef store fill:${PALETTE.surface},stroke:${PALETTE.primary},color:${PALETTE.text}`,
  `classDef external fill:${PALETTE.muted},stroke:${PALETTE.line},color:${PALETTE.text}`,
  `classDef mock fill:${PALETTE.surface},stroke:${PALETTE.line},color:${PALETTE.text},stroke-dasharray:5 3`,
  `classDef planned fill:${PALETTE.surface},stroke:${PALETTE.border},color:${PALETTE.subtle},stroke-dasharray:2 3`,
  `classDef control fill:${PALETTE.warningSoft},stroke:${PALETTE.warningBorder},color:${PALETTE.text}`,
  `classDef cloud fill:${PALETTE.infoSoft},stroke:${PALETTE.infoBorder},color:${PALETTE.text}`,
  `classDef boundary fill:${PALETTE.canvas},stroke:${PALETTE.line},color:${PALETTE.subtle},stroke-dasharray:6 4`,
];

/** A flowchart source with the shared classes added after its first line; other diagrams as they are. */
function prepared(text) {
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex((line) => line.trim() !== '' && !line.trim().startsWith('%%'));
  if (first === -1 || !/^(flowchart|graph)\b/.test(lines[first].trim())) return text;
  return [
    ...lines.slice(0, first + 1),
    ...CLASS_DEFS.map((line) => `  ${line}`),
    ...lines.slice(first + 1),
  ].join('\n');
}

// --- ER diagrams from schema.prisma ------------------------------------------

/** Models, enums and the schema's sections (its `// ─── Title ───` comments), in file order. */
function parseSchema(text) {
  const sections = [];
  const models = new Map();
  const enums = new Set();
  let section = null;
  let model = null;
  let inEnum = false;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^\/\/ ─── (.+?) ─/.exec(line);
    if (heading) {
      section = { title: heading[1].trim(), models: [] };
      sections.push(section);
      continue;
    }
    const opening = /^(model|enum) (\w+) \{/.exec(line);
    if (opening) {
      inEnum = opening[1] === 'enum';
      if (inEnum) {
        enums.add(opening[2]);
        model = null;
      } else {
        model = { name: opening[2], fields: [], blockAttributes: [] };
        models.set(model.name, model);
        section?.models.push(model.name);
      }
      continue;
    }
    if (line.startsWith('}')) {
      model = null;
      inEnum = false;
      continue;
    }
    if (!model || inEnum) continue;
    const content = line.trim();
    if (content === '' || content.startsWith('//')) continue;
    if (content.startsWith('@@')) {
      model.blockAttributes.push(content);
      continue;
    }
    const field = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(content);
    if (field) {
      model.fields.push({
        name: field[1],
        type: field[2],
        list: field[3] !== undefined,
        optional: field[4] !== undefined,
        attributes: field[5],
      });
    }
  }
  return { sections, models, enums };
}

/** The field names in a `[a, b]` list that follows `key:` in an attribute, such as `fields: [...]`. */
function listAfter(attributes, key) {
  const match = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(attributes);
  return match ? match[1].split(',').map((name) => name.trim()) : [];
}

/** The fields of a block attribute such as `@@id([a, b])`. */
function blockFields(model, attribute) {
  return model.blockAttributes
    .filter((line) => line.startsWith(`${attribute}(`))
    .map((line) => (/\[([^\]]*)\]/.exec(line)?.[1] ?? '').split(',').map((name) => name.trim()));
}

/** One section's entities and relationships as a Mermaid ER diagram. */
function erDiagram(section, schema) {
  const lines = [
    '%% Generated by scripts/build-diagrams.mjs from apps/api/prisma/schema.prisma.',
    '%% Do not edit: change the schema and run pnpm diagrams:build.',
    'erDiagram',
  ];
  const relationships = [];
  for (const name of section.models) {
    const model = schema.models.get(name);
    const compositeId = blockFields(model, '@@id').flat();
    const compositeUniques = blockFields(model, '@@unique');
    const foreignKeys = new Set(
      model.fields.flatMap((field) => listAfter(field.attributes, 'fields')),
    );
    const attributes = [];
    for (const field of model.fields) {
      const target = schema.models.get(field.type);
      if (target) {
        const keys = listAfter(field.attributes, 'fields');
        if (keys.length > 0) {
          const unique =
            keys.every((key) =>
              model.fields
                .find((candidate) => candidate.name === key)
                ?.attributes.includes('@unique'),
            ) || compositeUniques.some((fields) => fields.join() === keys.join());
          const left = unique ? '|o' : '}o';
          const right = field.optional ? 'o|' : '||';
          relationships.push(`  ${model.name} ${left}--${right} ${target.name} : ${field.name}`);
        } else if (field.list) {
          const back = target.fields.find(
            (candidate) => candidate.type === model.name && candidate.list,
          );
          if (back && model.name <= target.name) {
            relationships.push(`  ${model.name} }o--o{ ${target.name} : ${field.name}`);
          }
        }
        continue;
      }
      const markers = [];
      if (field.attributes.includes('@id') || compositeId.includes(field.name)) markers.push('PK');
      if (foreignKeys.has(field.name)) markers.push('FK');
      if (field.attributes.includes('@unique')) markers.push('UK');
      const type = `${field.type}${field.list ? '[]' : ''}`;
      attributes.push(
        `    ${type} ${field.name}${markers.length > 0 ? ` ${markers.join(', ')}` : ''}${field.optional ? ' "optional"' : ''}`,
      );
    }
    lines.push(`  ${model.name} {`, ...attributes, '  }');
  }
  return [...lines, ...relationships, ''].join('\n');
}

/** The schema's sections as ER sources, named `er-<section>`. */
function erSources() {
  const schema = parseSchema(readFileSync(SCHEMA, 'utf8'));
  return schema.sections
    .filter((section) => section.models.length > 0)
    .map((section) => ({
      name: `er-${section.title
        .replace(/\(.*\)/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`,
      text: erDiagram(section, schema),
    }));
}

// --- Sources, the manifest and rendering -------------------------------------

/**
 * A stylesheet with Geist's Latin face alone, beside copies of the font and its licence (the SIL
 * Open Font License, which allows embedding). Mermaid CLI embeds every face of a font family the
 * SVG uses, whatever its Unicode range, and the diagrams' text is English.
 */
function latinFontStylesheet() {
  const folder = mkdtempSync(join(tmpdir(), 'huitong-diagram-font-'));
  const css = readFileSync(join(GEIST, 'index.css'), 'utf8');
  const rule = /\/\* geist-latin-wght-normal \*\/\s*(@font-face \{[^}]*\})/.exec(css)?.[1];
  if (rule === undefined) throw new Error("Geist's Latin face is not in its stylesheet");
  copyFileSync(
    join(GEIST, 'files/geist-latin-wght-normal.woff2'),
    join(folder, 'geist-latin-wght-normal.woff2'),
  );
  copyFileSync(join(GEIST, 'LICENSE'), join(folder, 'LICENSE'));
  writeFileSync(join(folder, 'geist-latin.css'), rule.replace('./files/', './'));
  return { folder, url: pathToFileURL(join(folder, 'geist-latin.css')) };
}

/**
 * The SVG with every coordinate cut to two decimals: Mermaid writes full-precision floats, which at
 * diagram scale only add bytes. The embedded font is base64, which has no dots, so it is untouched.
 */
function compact(svg) {
  return svg.replace(/(\d\.\d{2})\d+/g, '$1');
}

/** What an SVG depends on: its prepared source and the configuration it was rendered with. */
function fingerprint(text) {
  return createHash('sha256')
    .update(prepared(text))
    .update(JSON.stringify(MERMAID_CONFIG))
    .digest('hex')
    .slice(0, 16);
}

/** Every hand-written source on disk (the generated ER sources come from the schema). */
function handWrittenSources() {
  return readdirSync(DIAGRAMS)
    .filter((file) => file.endsWith('.mmd') && !file.startsWith('er-'))
    .map((file) => ({
      name: file.slice(0, -4),
      text: readFileSync(join(DIAGRAMS, file), 'utf8'),
    }));
}

function check() {
  const problems = [];
  for (const source of erSources()) {
    const path = join(DIAGRAMS, `${source.name}.mmd`);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== source.text) {
      problems.push(`${source.name}.mmd no longer matches schema.prisma`);
    }
  }
  const sources = [...handWrittenSources(), ...erSources()];
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  for (const source of sources) {
    if (!existsSync(join(DIAGRAMS, `${source.name}.svg`)))
      problems.push(`${source.name}.svg is missing`);
    else if (manifest[source.name] !== fingerprint(source.text)) {
      problems.push(`${source.name}.svg was rendered from an older source or palette`);
    }
  }
  const names = new Set(sources.map((source) => source.name));
  for (const file of readdirSync(DIAGRAMS).filter((entry) => entry.endsWith('.svg'))) {
    if (!names.has(file.slice(0, -4))) problems.push(`${file} has no source`);
  }
  if (problems.length > 0) {
    console.error(`${problems.join('\n')}\nRun pnpm diagrams:build and commit the result.`);
    process.exit(1);
  }
  console.log(`diagrams are current (${String(sources.length)} sources)`);
}

async function build() {
  const generated = erSources();
  for (const file of readdirSync(DIAGRAMS).filter((entry) => /^er-.*\.(mmd|svg)$/.test(entry))) {
    if (!generated.some((source) => file.startsWith(`${source.name}.`)))
      rmSync(join(DIAGRAMS, file));
  }
  for (const source of generated) writeFileSync(join(DIAGRAMS, `${source.name}.mmd`), source.text);

  const sources = [...handWrittenSources(), ...generated];
  const web = createRequire(join(ROOT, 'apps/web/package.json'));
  const { chromium } = web('@playwright/test');
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? chromium.executablePath();
  const { default: puppeteer } = await import('puppeteer');
  const { renderMermaid } = await import('@mermaid-js/mermaid-cli');
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const font = latinFontStylesheet();
  const manifest = {};
  try {
    for (const source of sources) {
      const { data } = await renderMermaid(browser, prepared(source.text), 'svg', {
        mermaidConfig: MERMAID_CONFIG,
        backgroundColor: PALETTE.surface,
        fontEmbed: true,
        customFontCSS: [{ cssUrl: font.url }],
        svgId: source.name,
      });
      const svg = compact(Buffer.from(data).toString('utf8'));
      writeFileSync(join(DIAGRAMS, `${source.name}.svg`), svg);
      manifest[source.name] = fingerprint(source.text);
      console.log(`rendered ${source.name}.svg (${(svg.length / 1024).toFixed(1)} KB)`);
    }
  } finally {
    await browser.close();
    rmSync(font.folder, { recursive: true, force: true });
  }
  for (const file of readdirSync(DIAGRAMS).filter((entry) => entry.endsWith('.svg'))) {
    if (!(file.slice(0, -4) in manifest)) rmSync(join(DIAGRAMS, file));
  }
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

if (CHECK) check();
else await build();
