/*
 * React Bits StarBorder (free registry item @react-bits/StarBorder-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours and radius that the canvas re-reads per theme, a still frame under reduced
 * motion, pausing off-screen and in hidden tabs, the global focus ring, and a named export.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type FC,
  type ReactNode,
} from 'react';

import { useTokenColor } from '@/hooks/use-token-color';
import { cssColorToRgb, readTokenColor, type Rgb } from '@/lib/css-color';
import { cn } from '@/lib/utils';

export type StarBorderHover = 'lap' | 'brighten' | 'reveal' | 'none';

/** Corner radius token: `md` for controls, `lg` for surfaces, `full` for pills. */
export type StarBorderRadius = 'md' | 'lg' | 'full';

/** StarBorder's own props. Everything else is passed to the rendered element. */
export interface StarBorderOwnProps<T extends ElementType = 'button'> {
  /** Element or component to render. Defaults to a native `<button type="button">`. */
  as?: T;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Star colour: a token reference such as `var(--success)`, or any colour a canvas can paint. */
  color?: string;
  /** Colour the trail fades into. Defaults to `color`. */
  trailColor?: string;
  /** Seconds per lap. */
  duration?: number;
  /** Border thickness in pixels. */
  thickness?: number;
  radius?: StarBorderRadius;
  /** Trail length as a fraction of the lap time (0 to 1). */
  trailLength?: number;
  /** Stars sharing the border (1 to 6). */
  stars?: number;
  /** Bloom strength (0 to 1). */
  glow?: number;
  /** Adds a four-point glint and drifting dust to each star. */
  sparkle?: boolean;
  direction?: 'clockwise' | 'counterclockwise';
  /** Response to hover and keyboard focus: an extra lap, a brighter glow, reveal on demand, or none. */
  hover?: StarBorderHover;
  /** Sends a pulse around the border from the press point. */
  clickPulse?: boolean;
  /** Surface override. By default the `bg-card` token class applies. */
  backgroundColor?: string;
  /** Text override. By default the `text-card-foreground` token class applies. */
  textColor?: string;
  /** Resting border override. By default the `border-border-strong` token class applies. */
  borderColor?: string;
}

/** Props for {@link StarBorder}: its own props plus those of the element chosen with `as`. */
export type StarBorderProps<T extends ElementType = 'button'> = StarBorderOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof StarBorderOwnProps<T>>;

interface Segment {
  length: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number | null;
}

interface Shape {
  r: number;
  segments: Segment[];
  total: number;
}

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

interface Pulse {
  origin: number;
  age: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
}

interface Settings {
  reduce: boolean;
  /** Changes whenever anything the palette is read from changes: colours, theme, radius, classes. */
  paletteKey: string;
  color: string;
  trailColor: string;
  duration: number;
  thickness: number;
  trailLength: number;
  stars: number;
  glow: number;
  sparkle: boolean;
  direction: number;
  hover: StarBorderHover;
  clickPulse: boolean;
}

/** Values the canvas reads from CSS, refreshed when {@link Settings.paletteKey} changes. */
interface Palette {
  key: string;
  head: Rgb;
  tail: Rgb;
  /** The element's text colour: the hot core of the star on dark surfaces. */
  core: Rgb;
  /** True on light surfaces, where the star is painted normally instead of additively. */
  light: boolean;
  radius: number;
}

const RADIUS_CLASS: Record<StarBorderRadius, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

const ROOT =
  'relative isolate inline-flex min-h-10 items-center justify-center gap-2 bg-card px-4 py-2 text-sm font-medium text-card-foreground no-underline disabled:cursor-not-allowed disabled:opacity-50';

/** How far the glow may spill past the element, in CSS pixels. */
const BLEED = 48;
const CANVAS_STYLE: CSSProperties = {
  top: -BLEED,
  left: -BLEED,
  width: `calc(100% + ${BLEED * 2}px)`,
  height: `calc(100% + ${BLEED * 2}px)`,
};
const LAP = 0.9;
const TAU = Math.PI * 2;
const TOKEN_REFERENCE = /^var\(\s*(--[\w-]+)\s*\)$/;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (value: number, total: number) => ((value % total) + total) % total;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2);
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgba = (rgb: Rgb, alpha: number) =>
  `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, ${clamp(alpha, 0, 1).toFixed(3)})`;
const luminance = (rgb: Rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const isTokenName = (value: string): value is `--${string}` => value.startsWith('--');

/** A canvas cannot paint `var(--token)`, so a token reference is first read from the current theme. */
function canvasRgb(color: string): Rgb {
  const name = TOKEN_REFERENCE.exec(color.trim())?.[1];
  const token = name !== undefined && isTokenName(name) ? readTokenColor(name) : '';
  return cssColorToRgb(token || color);
}

const outline = (width: number, height: number, radius: number): Shape => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const arc = (Math.PI * r) / 2;
  const across = Math.max(0, width - 2 * r);
  const down = Math.max(0, height - 2 * r);
  const segments: Segment[] = [
    { length: across, x: r, y: 0, dx: 1, dy: 0, angle: null },
    { length: arc, x: width - r, y: r, dx: 0, dy: 0, angle: -Math.PI / 2 },
    { length: down, x: width, y: r, dx: 0, dy: 1, angle: null },
    { length: arc, x: width - r, y: height - r, dx: 0, dy: 0, angle: 0 },
    { length: across, x: width - r, y: height, dx: -1, dy: 0, angle: null },
    { length: arc, x: r, y: height - r, dx: 0, dy: 0, angle: Math.PI / 2 },
    { length: down, x: 0, y: height - r, dx: 0, dy: -1, angle: null },
    { length: arc, x: r, y: r, dx: 0, dy: 0, angle: Math.PI },
  ];
  return {
    r,
    segments,
    total: Math.max(
      1,
      segments.reduce((sum, segment) => sum + segment.length, 0),
    ),
  };
};

/** Writes the position and outward normal at `distance` along the outline into `point`. */
const pointAt = (shape: Shape, distance: number, point: Point) => {
  let s = wrap(distance, shape.total);
  for (const segment of shape.segments) {
    if (segment.length > 0 && s <= segment.length) {
      if (segment.angle === null) {
        point.x = segment.x + segment.dx * s;
        point.y = segment.y + segment.dy * s;
        point.nx = segment.dy;
        point.ny = -segment.dx;
      } else {
        const angle = segment.angle + s / shape.r;
        point.nx = Math.cos(angle);
        point.ny = Math.sin(angle);
        point.x = segment.x + point.nx * shape.r;
        point.y = segment.y + point.ny * shape.r;
      }
      return point;
    }
    s -= segment.length;
  }
  return point;
};

/** Distance along the outline of the point nearest to (px, py). */
const project = (shape: Shape, px: number, py: number) => {
  let best = Infinity;
  let found = 0;
  let offset = 0;
  for (const segment of shape.segments) {
    if (segment.length > 0) {
      let s: number;
      let x: number;
      let y: number;
      if (segment.angle === null) {
        s = clamp((px - segment.x) * segment.dx + (py - segment.y) * segment.dy, 0, segment.length);
        x = segment.x + segment.dx * s;
        y = segment.y + segment.dy * s;
      } else {
        let angle = wrap(Math.atan2(py - segment.y, px - segment.x) - segment.angle, TAU);
        if (angle > Math.PI / 2) angle = angle > Math.PI * 1.25 ? 0 : Math.PI / 2;
        s = angle * shape.r;
        x = segment.x + Math.cos(segment.angle + angle) * shape.r;
        y = segment.y + Math.sin(segment.angle + angle) * shape.r;
      }
      const distance = (px - x) ** 2 + (py - y) ** 2;
      if (distance < best) {
        best = distance;
        found = offset + s;
      }
    }
    offset += segment.length;
  }
  return found;
};

/**
 * A button (or any element via `as`) with a star of light travelling around its border.
 * Visible text comes from `children`, so pass translated content.
 */
export function StarBorder<T extends ElementType = 'button'>({
  as,
  children,
  className,
  style,
  color = 'var(--primary)',
  trailColor,
  duration = 4,
  thickness = 1,
  radius = 'md',
  trailLength = 0.3,
  stars = 1,
  glow = 0.6,
  sparkle = false,
  direction = 'clockwise',
  hover = 'lap',
  clickPulse = true,
  backgroundColor,
  textColor,
  borderColor,
  ...rest
}: StarBorderProps<T>) {
  const tag: ElementType = as ?? 'button';
  // StarBorderProps<T> already checks the props; the polymorphic element itself is rendered untyped.
  const Component = tag as unknown as FC<Record<string, unknown>>;
  const reduce = useReducedMotion() ?? false;
  // Flips with the theme class on <html>, which tells the canvas to re-read its token colours.
  const themeKey = useTokenColor('--primary');
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const settings: Settings = {
    reduce,
    paletteKey: [color, trailColor, themeKey, radius, textColor, className].join('|'),
    color,
    trailColor: trailColor ?? color,
    duration: Math.max(0.3, duration),
    thickness: Math.max(0.5, thickness),
    trailLength: clamp(trailLength, 0, 1),
    stars: clamp(Math.round(stars), 1, 6),
    glow: clamp(glow, 0, 1),
    sparkle,
    direction: direction === 'counterclockwise' ? -1 : 1,
    hover,
    clickPulse,
  };
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    wakeRef.current?.();
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return undefined;

    const point: Point = { x: 0, y: 0, nx: 0, ny: -1 };
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      phase: 0,
      velocity: 0,
      motion: 0,
      lap: -1,
      time: 0,
      reveal: 0,
      boost: 0,
      flash: 0,
      emit: 0,
      hovered: false,
      focused: false,
      visible: true,
      hidden: document.hidden,
    };
    const pulses: Pulse[] = [];
    const dust: Mote[] = [];
    const palette: Palette = {
      key: '',
      head: [1, 1, 1],
      tail: [1, 1, 1],
      core: [1, 1, 1],
      light: true,
      radius: 0,
    };
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const running = () => alive && state.visible && !state.hidden;

    const refreshPalette = (s: Settings) => {
      if (s.paletteKey === palette.key) return;
      palette.key = s.paletteKey;
      const computed = getComputedStyle(root);
      palette.head = canvasRgb(s.color);
      palette.tail = canvasRgb(s.trailColor);
      palette.core = cssColorToRgb(computed.color);
      // Dark text means a light surface: paint normally there, and additively on dark surfaces.
      palette.light = luminance(palette.core) < 0.5;
      const corner = Number.parseFloat(computed.borderTopLeftRadius);
      palette.radius = Number.isFinite(corner) ? corner : 0;
    };

    const measure = () => {
      state.width = root.offsetWidth;
      state.height = root.offsetHeight;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round((state.width + BLEED * 2) * state.dpr));
      canvas.height = Math.max(1, Math.round((state.height + BLEED * 2) * state.dpr));
      wake();
    };

    const local = (event: MouseEvent): [number, number] => {
      const rect = root.getBoundingClientRect();
      const scaleX = rect.width ? state.width / rect.width : 1;
      const scaleY = rect.height ? state.height / rect.height : 1;
      return [(event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY];
    };

    const shapeFor = (s: Settings) =>
      outline(
        Math.max(1, state.width - s.thickness),
        Math.max(1, state.height - s.thickness),
        palette.radius - s.thickness / 2,
      );

    const stroke = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width: number,
      paint: string | CanvasGradient,
    ) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = paint;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const drawTrail = (
      s: Settings,
      shape: Shape,
      head: number,
      length: number,
      sign: number,
      intensity: number,
      tip = true,
    ) => {
      if (length < 0.5 || intensity <= 0) return;
      const steps = clamp(Math.ceil(length / 2), 2, 90);
      pointAt(shape, head, point);
      let px = point.x;
      let py = point.y;
      for (let i = 1; i <= steps; i++) {
        pointAt(shape, head - sign * length * (i / steps), point);
        const u = 1 - (i - 0.5) / steps;
        const fade = u * u * intensity;
        let tone = mix(palette.tail, palette.head, u);
        if (!palette.light) tone = mix(tone, palette.core, u ** 6 * 0.65);
        ctx.lineCap = tip && i === 1 ? 'round' : 'butt';
        stroke(
          px,
          py,
          point.x,
          point.y,
          2 + 6 * s.glow,
          rgba(tone, fade * (palette.light ? 0.1 : 0.2) * s.glow),
        );
        stroke(px, py, point.x, point.y, s.thickness, rgba(tone, fade));
        px = point.x;
        py = point.y;
      }
    };

    const drawHead = (s: Settings, x: number, y: number, intensity: number, twinkle: number) => {
      if (intensity <= 0) return;
      const { head: tone, core, light } = palette;
      const reach = (12 + 40 * s.glow) * (light ? 0.6 : 1);
      const bloom = ctx.createRadialGradient(x, y, 0, x, y, reach);
      const strength = (light ? 0.08 : 0.4) * s.glow * intensity;
      bloom.addColorStop(0, rgba(tone, strength));
      bloom.addColorStop(0.2, rgba(tone, strength * 0.4));
      bloom.addColorStop(0.5, rgba(tone, strength * 0.1));
      bloom.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
      if (!s.sparkle) return;

      const size = (1 + s.thickness * 0.6) * (light ? 0.85 : 1);
      const glint = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
      glint.addColorStop(0, rgba(light ? tone : core, intensity));
      glint.addColorStop(
        light ? 0.3 : 0.4,
        rgba(light ? tone : mix(tone, core, 0.5), intensity * 0.9),
      );
      glint.addColorStop(light ? 0.55 : 1, rgba(tone, light ? intensity * 0.12 : 0));
      glint.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.2, 0, TAU);
      ctx.fill();

      const spike = (3 + 4 * s.glow + s.thickness * 1.5) * twinkle;
      const center = light ? tone : core;
      const horizontal = ctx.createLinearGradient(x - spike, y, x + spike, y);
      horizontal.addColorStop(0, rgba(tone, 0));
      horizontal.addColorStop(0.5, rgba(center, intensity * 0.95));
      horizontal.addColorStop(1, rgba(tone, 0));
      stroke(x - spike, y, x + spike, y, light ? 0.75 : 1, horizontal);
      const vertical = ctx.createLinearGradient(x, y - spike, x, y + spike);
      vertical.addColorStop(0, rgba(tone, 0));
      vertical.addColorStop(0.5, rgba(center, intensity * 0.95));
      vertical.addColorStop(1, rgba(tone, 0));
      stroke(x, y - spike, x, y + spike, light ? 0.75 : 1, vertical);
    };

    const spawnDust = (x: number, y: number, nx: number, ny: number, speed: number) => {
      if (dust.length > 48) return;
      const push = 3 + Math.random() * 10;
      const drift = (Math.random() - 0.5) * 8;
      dust.push({
        x: x + nx * (Math.random() * 3 - 1),
        y: y + ny * (Math.random() * 3 - 1),
        vx: nx * push - ny * drift - speed * -ny * 0.04,
        vy: ny * push + nx * drift - speed * nx * 0.04,
        age: 0,
        life: 0.35 + Math.random() * 0.5,
        size: 0.45 + Math.random() * 0.7,
        seed: Math.random() * TAU,
      });
    };

    const draw = (base: Settings, shape: Shape) => {
      const s =
        state.boost > 0.001
          ? { ...base, glow: Math.min(1.5, base.glow + 0.4 * state.boost) }
          : base;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (state.width < 2 || state.height < 2) return;
      const offset = (BLEED + s.thickness / 2) * state.dpr;
      ctx.setTransform(state.dpr, 0, 0, state.dpr, offset, offset);
      ctx.globalCompositeOperation = palette.light ? 'source-over' : 'lighter';
      ctx.lineCap = 'butt';

      const total = shape.total;
      const spacing = total / s.stars;
      const speed = Math.abs(state.motion);
      const sign = state.motion >= 0 ? 1 : -1;
      const span = s.trailLength * s.duration;
      const length = Math.min(speed * span, spacing * 0.92, total * 0.6);
      const intensity = state.reveal * (1 + 0.4 * state.boost + 0.6 * state.flash);

      const ring =
        state.flash * (palette.light ? 0.18 : 0.32) +
        state.boost * state.reveal * (palette.light ? 0.07 : 0.12);
      if (ring > 0.005) {
        ctx.lineWidth = s.thickness + 2 * s.glow;
        ctx.strokeStyle = rgba(palette.head, ring);
        ctx.beginPath();
        ctx.roundRect(
          0,
          0,
          Math.max(1, state.width - s.thickness),
          Math.max(1, state.height - s.thickness),
          Math.max(0, shape.r),
        );
        ctx.stroke();
      }

      // A resting star spreads a short glow both ways; it fades out as the star picks up speed.
      const still =
        clamp(1 - speed / Math.max(1, (total / s.duration) * 0.6), 0, 1) * Math.min(1, intensity);
      const rest = (10 + 14 * s.glow + s.thickness * 2) * still;
      for (let i = 0; i < s.stars; i++) {
        const head = state.phase + i * spacing;
        drawTrail(s, shape, head, length, sign, Math.min(1, intensity));
        if (still > 0.01) {
          drawTrail(s, shape, head, rest, 1, still, false);
          drawTrail(s, shape, head, rest, -1, still, false);
        }
      }

      for (const wave of pulses) {
        const progress = wave.age / 0.65;
        const fade = (1 - progress) ** 2;
        const travel = (total / 2) * (1 - (1 - Math.min(1, wave.age / 0.5)) ** 2);
        const tail = Math.min(travel, total * 0.16);
        for (const way of [1, -1]) {
          const front = wave.origin + way * travel;
          drawTrail(s, shape, front, tail, way, fade);
          pointAt(shape, front, point);
          drawHead(s, point.x, point.y, fade * 0.8, 0.8);
        }
      }

      for (let i = 0; i < s.stars; i++) {
        pointAt(shape, state.phase + i * spacing, point);
        const twinkle = s.reduce
          ? 1
          : 0.82 + 0.18 * Math.sin(state.time * 6.1 + i * 2.3) * Math.sin(state.time * 2.7 + i);
        drawHead(s, point.x, point.y, Math.min(1.3, intensity), twinkle);
      }

      for (const mote of dust) {
        const left = 1 - mote.age / mote.life;
        const shimmer = 0.45 + 0.55 * Math.sin(state.time * 20 + mote.seed);
        const alpha = left * shimmer * state.reveal * (palette.light ? 0.35 : 0.9);
        if (alpha > 0.01) {
          ctx.fillStyle = rgba(
            palette.light ? palette.head : mix(palette.tail, palette.core, 0.6),
            alpha,
          );
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, mote.size * (0.6 + 0.4 * left), 0, TAU);
          ctx.fill();
        }
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      refreshPalette(s);

      const shape = shapeFor(s);
      const total = shape.total;
      const spacing = total / s.stars;
      const engaged = state.hovered || state.focused;
      const revealTarget = s.hover === 'reveal' && !engaged ? 0 : 1;
      const boostTarget = s.hover === 'brighten' && engaged ? 1 : 0;

      if (s.reduce) {
        // Reduced motion: one still frame. Every transition jumps to its end state and nothing is scheduled.
        state.reveal = revealTarget;
        state.boost = boostTarget;
        state.flash = 0;
        state.velocity = 0;
        state.motion = 0;
        state.lap = -1;
        pulses.length = 0;
        dust.length = 0;
        draw(s, shape);
        return;
      }

      state.time += dt;
      const cruise = (s.direction * total) / s.duration;
      state.reveal +=
        (revealTarget - state.reveal) *
        (1 - Math.exp(-dt / (revealTarget > state.reveal ? 0.16 : 0.45)));
      state.boost +=
        (boostTarget - state.boost) *
        (1 - Math.exp(-dt / (boostTarget > state.boost ? 0.18 : 0.5)));
      state.flash *= Math.exp(-dt / 0.22);

      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / 0.45));
      let extra = 0;
      if (state.lap >= 0) {
        const before = ease(Math.min(1, state.lap / LAP));
        state.lap += dt;
        extra = (ease(Math.min(1, state.lap / LAP)) - before) * total * s.direction;
        if (state.lap >= LAP) state.lap = -1;
      }
      state.motion = state.velocity + extra / dt;
      state.phase = wrap(state.phase + state.velocity * dt + extra, total);

      const pace = Math.abs(state.motion) / Math.max(1, Math.abs(total / s.duration));
      if (s.sparkle && state.reveal > 0.05) {
        state.emit += dt * (2 + 6 * Math.min(2, pace)) * s.stars;
        while (state.emit > 1) {
          state.emit -= 1;
          pointAt(shape, state.phase + Math.floor(Math.random() * s.stars) * spacing, point);
          spawnDust(point.x, point.y, point.nx, point.ny, state.motion);
        }
      }
      for (let i = dust.length - 1; i >= 0; i--) {
        const mote = dust[i];
        if (!mote) continue;
        mote.age += dt;
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.vx *= Math.exp(-dt * 2.2);
        mote.vy *= Math.exp(-dt * 2.2);
        if (mote.age >= mote.life) dust.splice(i, 1);
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const wave = pulses[i];
        if (!wave) continue;
        wave.age += dt;
        if (wave.age >= 0.65) pulses.splice(i, 1);
      }

      draw(s, shape);

      const settling =
        Math.abs(revealTarget - state.reveal) > 0.002 ||
        Math.abs(boostTarget - state.boost) > 0.002 ||
        state.flash > 0.01 ||
        pulses.length > 0 ||
        dust.length > 0;
      const moving = Math.abs(state.motion) > 0.05 || cruise !== 0 || state.lap >= 0;
      const showing = state.reveal > 0.002 || revealTarget > 0;
      if (running() && (settling || (moving && showing) || state.hovered)) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (raf || !running()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onEnter = (event: PointerEvent) => {
      const s = settingsRef.current;
      const [x, y] = local(event);
      state.hovered = true;
      if (s.hover === 'reveal' && state.reveal < 0.15 && !s.reduce) {
        state.phase = project(shapeFor(s), x - s.thickness / 2, y - s.thickness / 2);
        state.velocity = 0;
      }
      if (s.hover === 'lap' && state.lap < 0 && !s.reduce) state.lap = 0;
      wake();
    };
    const onLeave = () => {
      state.hovered = false;
      wake();
    };
    const pulse = (origin: number) => {
      const s = settingsRef.current;
      if (!s.clickPulse || s.reduce) return;
      pulses.push({ origin, age: 0 });
      if (pulses.length > 4) pulses.shift();
      state.flash = 1;
      wake();
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const s = settingsRef.current;
      const [x, y] = local(event);
      pulse(project(shapeFor(s), x - s.thickness / 2, y - s.thickness / 2));
    };
    const onClick = (event: MouseEvent) => {
      // detail 0 means keyboard activation: pulse from where the star currently is.
      if (event.detail === 0) pulse(state.phase);
    };
    const onFocus = () => {
      const s = settingsRef.current;
      state.focused = root.matches(':focus-visible');
      if (state.focused && s.hover === 'lap' && state.lap < 0 && !s.reduce) state.lap = 0;
      wake();
    };
    const onBlur = () => {
      state.focused = false;
      wake();
    };
    const onVisibilityChange = () => {
      state.hidden = document.hidden;
      wake();
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resizeObserver?.observe(root);
    const visibility =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            state.visible = entries.some((entry) => entry.isIntersecting);
            wake();
          });
    visibility?.observe(root);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('click', onClick);
    root.addEventListener('focus', onFocus);
    root.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    measure();

    return () => {
      alive = false;
      wakeRef.current = null;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      visibility?.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('click', onClick);
      root.removeEventListener('focus', onFocus);
      root.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <Component
      ref={rootRef}
      type={tag === 'button' ? 'button' : undefined}
      {...rest}
      className={cn(
        ROOT,
        RADIUS_CLASS[radius],
        (tag === 'button' || tag === 'a') && 'cursor-pointer',
        className,
      )}
      style={{ backgroundColor, color: textColor, ...style }}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-1 border border-border-strong',
          RADIUS_CLASS[radius],
        )}
        style={{ borderWidth: settings.thickness, borderColor }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -z-1"
        style={CANVAS_STYLE}
      />
      {children}
    </Component>
  );
}
