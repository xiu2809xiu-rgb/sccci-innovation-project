/** sRGB channels in the range 0 to 1, the form WebGL uniforms expect. */
export type Rgb = readonly [red: number, green: number, blue: number];

/** Mid-grey, used when no 2D canvas is available (tests, very old browsers). */
const FALLBACK_RGB: Rgb = [0.5, 0.5, 0.5];

let probe: CanvasRenderingContext2D | null | undefined;

function probeContext(): CanvasRenderingContext2D | null {
  if (probe === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    probe = canvas.getContext('2d', { willReadFrequently: true });
  }
  return probe;
}

/**
 * Converts any CSS colour the browser understands (including `oklch()`) to
 * sRGB channels by painting one pixel. Canvas and WebGL effects use this to
 * draw with design tokens instead of hard-coded hex values.
 */
export function cssColorToRgb(color: string): Rgb {
  const context = probeContext();
  if (!context) {
    return FALLBACK_RGB;
  }
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return [red / 255, green / 255, blue / 255];
}

/** `#rrggbb` for any CSS colour, for libraries that only parse hex (three.js materials). */
export function cssColorToHex(color: string): string {
  return `#${cssColorToRgb(color)
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** The current value of a design token (a CSS custom property on `<html>`), e.g. `--primary`. */
export function readTokenColor(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
