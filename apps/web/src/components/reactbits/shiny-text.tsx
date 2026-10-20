/*
 * React Bits ShinyText (free registry item @react-bits/ShinyText-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours blended with CSS color-mix (theme-aware), a static resting state under
 * reduced motion, and a sweep loop that pauses off-screen or in a hidden tab.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ShinyTextEasing = 'smooth' | 'linear' | 'snappy';
export type ShinyTextTrigger = 'loop' | 'hover' | 'view';

/** Props for {@link ShinyText}. */
export interface ShinyTextProps {
  /** Text to render when no children are given. */
  text?: string;
  children?: ReactNode;
  /** Resting text colour: any CSS colour, defaults to the muted-foreground token. */
  color?: string;
  /** Colour at the centre of the band: any CSS colour, defaults to the foreground token. */
  shineColor?: string;
  /** Seconds per sweep. */
  speed?: number;
  /** Seconds between loop sweeps. */
  delay?: number;
  /** Gradient angle in degrees. */
  angle?: number;
  /** Band width as a percentage of the text box (2 to 200). */
  shineWidth?: number;
  /** Edge softness from 0 (hard) to 1 (fully feathered). */
  softness?: number;
  /** Number of bands, 1 to 3. */
  bands?: number;
  /** Strength of a blurred glow behind the band, 0 to 1. */
  glow?: number;
  direction?: 'left' | 'right';
  easing?: ShinyTextEasing;
  /** `loop` repeats, `hover` sweeps on pointer enter, `view` sweeps once when scrolled into view. */
  trigger?: ShinyTextTrigger;
  /** Alternate the sweep direction on each loop. */
  yoyo?: boolean;
  /** Let the band follow the pointer while it is over the text. */
  followPointer?: boolean;
  pauseOnHover?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

type Phase = 'idle' | 'sweep' | 'wait' | 'follow';

/** Mutable state of one mounted loop; positions are percentages along the gradient line. */
interface LoopState {
  pos: number | null;
  vel: number;
  phase: Phase;
  from: number;
  to: number;
  start: number;
  duration: number;
  resume: number;
  flip: boolean;
  inside: boolean;
  target: number;
  onScreen: boolean;
  pageVisible: boolean;
  seen: boolean;
}

interface Settings {
  color: string;
  shineColor: string;
  speed: number;
  delay: number;
  angle: number;
  shineWidth: number;
  softness: number;
  bands: number;
  glow: number;
  sign: number;
  ease: (t: number) => number;
  trigger: ShinyTextTrigger;
  yoyo: boolean;
  followPointer: boolean;
  pauseOnHover: boolean;
  /** Disabled or reduced motion: draw the resting colour and schedule no frames. */
  still: boolean;
}

const EASINGS: Record<ShinyTextEasing, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  snappy: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
};
const FALLOFF = [0, 0.2, 0.4, 0.6, 0.8, 1];
const FOLLOW_STIFFNESS = 220;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const solid = (color: string) => `linear-gradient(${color}, ${color})`;

/**
 * A colour `amount` (0 to 1) of the way from `from` to `to`. The browser does the mixing, so
 * `var(--token)` colours keep following the theme instead of being parsed once.
 */
function mix(from: string, to: string, amount: number): string {
  if (amount <= 0) return from;
  if (amount >= 1) return to;
  return `color-mix(in oklab, ${from}, ${to} ${(amount * 100).toFixed(1)}%)`;
}

/** The text-clipped gradient for a band centred at `pos` (percent along the gradient line). */
function sweepGradient(pos: number, fill: string, s: Settings): string {
  const half = s.shineWidth / 2;
  const core = half * (1 - s.softness);
  const fade = half - core;
  const stops: [number, number][] = [];
  for (let band = 0; band < s.bands; band++) {
    const center = pos - s.sign * band * s.shineWidth * 1.3;
    const strength = 1 - band * 0.28;
    for (const side of [-1, 1]) {
      for (const f of FALLOFF) {
        stops.push([center + side * (core + fade * (1 - f)), f * f * (3 - 2 * f) * strength]);
      }
    }
  }
  stops.sort((a, b) => a[0] - b[0]);
  const list = stops.map(([at, amount]) => `${mix(fill, s.shineColor, amount)} ${at.toFixed(2)}%`);
  return `linear-gradient(${s.angle}deg, ${fill} 0%, ${list.join(', ')}, ${fill} 100%)`;
}

/**
 * Text with a soft highlight band sweeping across it. With reduced motion, or when `disabled`,
 * the text rests in `color` and no animation frames are scheduled.
 */
export function ShinyText({
  text,
  children,
  color = 'var(--muted-foreground)',
  shineColor = 'var(--foreground)',
  speed = 2,
  delay = 0,
  angle = 120,
  shineWidth = 40,
  softness = 0.8,
  bands = 1,
  glow = 0,
  direction = 'left',
  easing = 'smooth',
  trigger = 'loop',
  yoyo = false,
  followPointer = false,
  pauseOnHover = false,
  disabled = false,
  className,
  style,
}: ShinyTextProps) {
  const reduceMotion = useReducedMotion() === true;
  const rootRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const settings: Settings = {
    color,
    shineColor,
    speed: Math.max(0.1, speed),
    delay: Math.max(0, delay),
    angle,
    shineWidth: clamp(shineWidth, 2, 200),
    softness: clamp(softness, 0, 1),
    bands: clamp(Math.round(bands), 1, 3),
    glow: clamp(glow, 0, 1),
    sign: direction === 'right' ? 1 : -1,
    ease: EASINGS[easing],
    trigger,
    yoyo,
    followPointer,
    pauseOnHover,
    still: disabled || reduceMotion,
  };
  const settingsRef = useRef(settings);
  const syncRef = useRef<(() => void) | null>(null);

  // Hands the latest props to the running loop without restarting it.
  useEffect(() => {
    settingsRef.current = settings;
    syncRef.current?.();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    // Hoisted function declarations below do not see the narrowing above.
    const host: HTMLElement = root;

    const state: LoopState = {
      pos: null,
      vel: 0,
      phase: 'idle',
      from: 0,
      to: 0,
      start: 0,
      duration: 1,
      resume: 0,
      flip: false,
      inside: false,
      target: 0,
      onScreen: true,
      pageVisible: document.visibilityState !== 'hidden',
      seen: false,
    };
    let raf = 0;
    let timer = 0;
    let last = 0;
    let alive = true;

    const extent = () => {
      const s = settingsRef.current;
      return s.shineWidth / 2 + (s.bands - 1) * s.shineWidth * 1.3 + 2;
    };
    const entry = () => (settingsRef.current.sign > 0 ? -extent() : 100 + extent());
    const exit = () => (settingsRef.current.sign > 0 ? 100 + extent() : -extent());
    const nearest = () => (state.target < 50 ? -extent() : 100 + extent());
    const live = () => state.onScreen && state.pageVisible;

    function draw() {
      const s = settingsRef.current;
      const glowLayer = glowRef.current;
      if (state.pos === null || s.still) {
        host.style.backgroundImage = solid(s.color);
        if (glowLayer) glowLayer.style.backgroundImage = 'none';
        return;
      }
      host.style.backgroundImage = sweepGradient(state.pos, s.color, s);
      if (glowLayer) {
        glowLayer.style.backgroundImage = sweepGradient(state.pos, 'transparent', s);
        glowLayer.style.opacity = String(s.glow);
      }
    }

    /** Cancels pending work and rests in the plain colour; `wake` starts again from idle. */
    function stop() {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      raf = 0;
      timer = 0;
      state.pos = null;
      state.vel = 0;
      state.phase = 'idle';
      draw();
    }

    function sweep(from: number, to: number, now: number) {
      const span = Math.abs(exit() - entry()) || 1;
      state.phase = 'sweep';
      state.from = from;
      state.to = to;
      state.start = now;
      state.duration =
        settingsRef.current.speed * 1000 * Math.max(0.15, Math.abs(to - from) / span);
    }

    function wake() {
      if (raf || !alive || settingsRef.current.still || !live()) return;
      window.clearTimeout(timer);
      timer = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function tick(now: number) {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      if (s.still || !live()) {
        stop();
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      if (s.followPointer && state.inside) {
        state.pos ??= nearest();
        state.vel +=
          ((state.target - state.pos) * FOLLOW_STIFFNESS -
            state.vel * 2 * Math.sqrt(FOLLOW_STIFFNESS)) *
          dt;
        state.pos += state.vel * dt;
        state.phase = 'follow';
        draw();
        raf = requestAnimationFrame(tick);
        return;
      }
      if (state.phase === 'follow') {
        state.vel = 0;
        sweep(state.pos ?? nearest(), nearest(), now);
      }
      if (state.phase === 'sweep') {
        if (s.pauseOnHover && state.inside) {
          state.start += dt * 1000;
          raf = requestAnimationFrame(tick);
          return;
        }
        const t = clamp((now - state.start) / state.duration, 0, 1);
        state.pos = state.from + (state.to - state.from) * s.ease(t);
        draw();
        if (t < 1) {
          raf = requestAnimationFrame(tick);
          return;
        }
        if (s.trigger !== 'loop') {
          state.phase = 'idle';
          state.pos = null;
          draw();
          return;
        }
        state.phase = 'wait';
        state.resume = now + s.delay * 1000;
      }
      if (state.phase === 'wait') {
        if (now < state.resume) {
          window.clearTimeout(timer);
          timer = window.setTimeout(wake, state.resume - now);
          return;
        }
        if (s.yoyo) {
          state.flip = !state.flip;
          sweep(state.flip ? exit() : entry(), state.flip ? entry() : exit(), now);
        } else {
          sweep(entry(), exit(), now);
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (s.trigger === 'loop') {
        state.flip = false;
        sweep(entry(), exit(), now);
        raf = requestAnimationFrame(tick);
      }
    }

    const locate = (event: PointerEvent) => {
      const radians = (settingsRef.current.angle * Math.PI) / 180;
      const rect = root.getBoundingClientRect();
      const dx = Math.sin(radians);
      const dy = -Math.cos(radians);
      const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy) || 1;
      const along =
        (event.clientX - rect.left - rect.width / 2) * dx +
        (event.clientY - rect.top - rect.height / 2) * dy;
      return 50 + (along / length) * 100;
    };

    const onEnter = (event: PointerEvent) => {
      const s = settingsRef.current;
      state.inside = true;
      state.target = locate(event);
      if (s.still) return;
      if (s.followPointer) {
        state.pos ??= nearest();
      } else if (s.trigger === 'hover' && state.phase === 'idle') {
        sweep(entry(), exit(), performance.now());
      }
      wake();
    };
    const onMove = (event: PointerEvent) => {
      state.target = locate(event);
      if (settingsRef.current.followPointer) wake();
    };
    const onLeave = () => {
      state.inside = false;
      wake();
    };

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            state.onScreen = entries.some((item) => item.isIntersecting);
            if (!state.onScreen) {
              stop();
              return;
            }
            const s = settingsRef.current;
            if (s.trigger === 'view' && !state.seen && !s.still) {
              state.seen = true;
              sweep(entry(), exit(), performance.now());
            }
            wake();
          });
    observer?.observe(root);

    const onVisibilityChange = () => {
      state.pageVisible = document.visibilityState !== 'hidden';
      if (state.pageVisible) wake();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    syncRef.current = () => {
      const s = settingsRef.current;
      if (s.still) {
        stop();
        return;
      }
      if (s.trigger !== 'loop' && state.phase === 'wait') {
        state.phase = 'idle';
        state.pos = null;
      }
      draw();
      wake();
    };
    draw();
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      syncRef.current = null;
    };
  }, []);

  const content = children ?? text;

  return (
    <span
      ref={rootRef}
      className={cn(
        'relative inline-block [background-size:100%_100%] bg-clip-text bg-no-repeat [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentcolor]',
        className,
      )}
      style={{ backgroundImage: solid(color), ...style }}
    >
      {content}
      {glow > 0 ? (
        <span
          ref={glowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-size:100%_100%] bg-clip-text bg-no-repeat blur-[0.14em] select-none [-webkit-background-clip:text] forced-colors:hidden"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
