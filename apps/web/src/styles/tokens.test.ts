import { describe, expect, it } from 'vitest';

import css from './tokens.css?raw';

type Theme = 'light' | 'dark';

/** `--name: value;` declarations inside the first block that opens with `selector {`. */
function block(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf('}', start);
  const body = css.slice(start, end);
  const entries = [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
    ([, name, value]) => [name ?? '', (value ?? '').trim()] as const,
  );
  return new Map(entries);
}

const tokens: Record<Theme, Map<string, string>> = {
  light: block(':root'),
  dark: new Map([...block(':root'), ...block('.dark')]),
};

/** Follows `var(--x)` references to the final `oklch(...)` value. */
function resolve(name: string, theme: Theme): string {
  const value = tokens[theme].get(name);
  if (value === undefined) {
    throw new Error(`token ${name} is not defined for ${theme}`);
  }
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] ? resolve(reference[1], theme) : value;
}

/** WCAG relative luminance of an `oklch(L C H)` colour, clipped to the sRGB gamut. */
function luminance(oklch: string): number {
  const match = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/.exec(oklch);
  if (!match) {
    throw new Error(`not an opaque oklch() colour: ${oklch}`);
  }
  const [lightness, chroma, hue] = match.slice(1).map(Number) as [number, number, number];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (channel: number) => Math.min(1, Math.max(0, channel));
  const red = clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string, theme: Theme): number {
  const [lighter, darker] = [
    luminance(resolve(foreground, theme)),
    luminance(resolve(background, theme)),
  ].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Text pairs need 4.5:1 (WCAG 1.4.3). */
const TEXT_PAIRS: [string, string][] = [
  ['--foreground', '--background'],
  ['--foreground', '--card'],
  ['--foreground', '--muted'],
  ['--muted-foreground', '--background'],
  ['--muted-foreground', '--card'],
  ['--muted-foreground', '--muted'],
  ['--subtle-foreground', '--card'],
  ['--subtle-foreground', '--background'],
  ['--primary-foreground', '--primary'],
  ['--primary-foreground', '--primary-hover'],
  ['--primary', '--card'],
  ['--primary', '--background'],
  ['--primary-subtle-foreground', '--primary-subtle'],
  ['--success', '--success-subtle'],
  ['--success', '--card'],
  ['--warning', '--warning-subtle'],
  ['--warning', '--card'],
  ['--danger', '--danger-subtle'],
  ['--danger', '--card'],
  ['--info', '--info-subtle'],
  ['--info', '--card'],
  ['--destructive-foreground', '--destructive'],
  ['--accent-foreground', '--accent'],
  ['--sidebar-foreground', '--sidebar'],
  ['--sidebar-accent-foreground', '--sidebar-accent'],
  ['--sidebar-primary-foreground', '--sidebar-primary'],
];

/** Control boundaries, focus rings and chart marks need 3:1 (WCAG 1.4.11). */
const NON_TEXT_PAIRS: [string, string][] = [
  ['--input', '--card'],
  ['--input', '--background'],
  ['--ring', '--card'],
  ['--ring', '--background'],
  ['--chart-1', '--card'],
  ['--chart-2', '--card'],
  ['--chart-3', '--card'],
  ['--chart-4', '--card'],
  ['--chart-5', '--card'],
];

describe.each<Theme>(['light', 'dark'])('%s theme tokens', (theme) => {
  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1', (foreground, background) => {
    expect(contrast(foreground, background, theme)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)('%s on %s meets 3:1', (foreground, background) => {
    expect(contrast(foreground, background, theme)).toBeGreaterThanOrEqual(3);
  });
});
