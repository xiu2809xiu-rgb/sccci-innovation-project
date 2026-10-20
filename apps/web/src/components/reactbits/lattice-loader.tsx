/*
 * React Bits LatticeLoader (free registry item @react-bits/LatticeLoader-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours, translated labels and an Intl-formatted timer, a static grid under
 * reduced motion, and keyframes that pause while off-screen or in a hidden tab.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';

import { cn } from '@/lib/utils';

import './lattice-loader.css';

export type LatticeStatus = 'working' | 'done' | 'error';
export type LatticePatternName =
  'arrow' | 'dots' | 'orbit' | 'ripple' | 'snake' | 'spiral' | 'sweep' | 'spin' | 'rain' | 'pulse';
export type LatticeGrid = 3 | 4;

/** A custom wave: each cell's step in the cycle, or `null` for a hole. */
export interface LatticePattern {
  cells: (number | null)[];
  /** Cycle length in steps. */
  loop?: number;
  /** Step length multiplier. */
  scale?: number;
  /** Share of the cycle each cell stays lit. */
  lit?: 0.25 | 0.35 | 0.45 | 0.62;
}

/** Props for {@link LatticeLoader}. */
export interface LatticeLoaderProps {
  /** Visible and announced while working, already translated, e.g. `t('ai.mapping.thinking')`. */
  label: string;
  /** Shown before the elapsed time when done, already translated, e.g. "Done in". */
  doneLabel: string;
  /** Shown before the elapsed time on error, already translated, e.g. "Failed after". */
  errorLabel: string;
  status?: LatticeStatus;
  pattern?: LatticePatternName | LatticePattern;
  grid?: LatticeGrid;
  shape?: 'square' | 'round';
  /** Cell colour while working. Any CSS colour. */
  color?: string;
  /** Cell colour of the done mark. Any CSS colour. */
  doneColor?: string;
  /** Cell colour of the error mark. Any CSS colour. */
  errorColor?: string;
  /** Cell size in pixels. */
  cellSize?: number;
  /** Gap between cells in pixels. */
  gap?: number;
  /** Milliseconds per wave step. */
  step?: number;
  /** Opacity of unlit cells, 0 to 1. */
  idleOpacity?: number;
  glow?: boolean;
  /** Glow colour; defaults to the cell colour. */
  glowColor?: string;
  showTimer?: boolean;
  /** Controlled elapsed time in seconds. Leave unset to time the working run internally. */
  elapsed?: number;
  /** BCP 47 locale for the timer, e.g. `i18n.language`. Defaults to the browser locale. */
  locale?: string;
  className?: string;
  style?: CSSProperties;
}

interface ResolvedPattern {
  cells: (number | null)[];
  loop: number;
  scale: number;
  lit: number;
}

type Mark = Exclude<LatticeStatus, 'working'>;

const PATTERNS: Record<LatticePatternName, Partial<Record<LatticeGrid, ResolvedPattern>>> = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1, lit: 0.62 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4, lit: 0.62 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5, lit: 0.62 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2, lit: 0.62 },
    4: {
      cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6],
      loop: 6,
      scale: 1.2,
      lit: 0.45,
    },
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: {
      cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
      loop: 16,
      scale: 1,
      lit: 0.25,
    },
  },
  sweep: {
    4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 },
  },
  spin: {
    4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 },
  },
  rain: {
    4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 },
  },
  pulse: {
    4: {
      cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2],
      loop: 2.4,
      scale: 2.5,
      lit: 0.45,
    },
  },
};
const FALLBACK_PATTERN: Record<LatticeGrid, ResolvedPattern> = {
  3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2, lit: 0.62 },
  4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 },
};
/** Cells lit to draw a check (done) or a cross (error). */
const MARKS: Record<LatticeGrid, Record<Mark, readonly number[]>> = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
};
/** One keyframe per lit share: a cell fades up, holds and fades back within that share of the cycle. */
const KEYFRAME_NAMES: Record<number, string> = {
  62: 'huitong-lattice-on-62',
  45: 'huitong-lattice-on-45',
  35: 'huitong-lattice-on-35',
  25: 'huitong-lattice-on-25',
};
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** Opacity of every pattern cell in the still frame shown under reduced motion. */
const STILL_OPACITY = 0.6;

function resolvePattern(
  pattern: LatticePatternName | LatticePattern,
  grid: LatticeGrid,
): ResolvedPattern {
  if (typeof pattern === 'string') {
    return PATTERNS[pattern][grid] ?? FALLBACK_PATTERN[grid];
  }
  const cells = Array.from({ length: grid * grid }, (_, index) => pattern.cells[index] ?? null);
  const steps = cells.filter((cell): cell is number => cell !== null);
  return {
    cells,
    loop: pattern.loop ?? Math.max(0, ...steps) + 4.2,
    scale: pattern.scale ?? 1,
    lit: pattern.lit ?? 0.62,
  };
}

interface DurationFormatters {
  seconds: Intl.NumberFormat;
  minutes: Intl.NumberFormat;
  list: Intl.ListFormat;
}

function createFormatters(
  locale: string | undefined,
  unitDisplay: 'narrow' | 'long',
): DurationFormatters {
  return {
    seconds: new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    minutes: new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay }),
    list: new Intl.ListFormat(locale, { type: 'unit', style: unitDisplay }),
  };
}

/** Formats tenths of a second as "3.2s" / "1m 3.2s" (narrow) or "3.2 seconds" (long), per locale. */
function formatDuration(deciseconds: number, formatters: DurationFormatters): string {
  if (deciseconds < 600) {
    return formatters.seconds.format(deciseconds / 10);
  }
  return formatters.list.format([
    formatters.minutes.format(Math.floor(deciseconds / 600)),
    formatters.seconds.format((deciseconds % 600) / 10),
  ]);
}

function subscribeToVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** False while the browser tab is hidden. */
function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );
}

/** False while the element is scrolled out of view. Stays true where IntersectionObserver is missing. */
function useOnScreen(node: Element | null): boolean {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);
      if (latest) {
        setOnScreen(latest.isIntersecting);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node]);
  return onScreen;
}

/**
 * A small grid loader for background work (AI suggestions, syncs). A wave runs across the grid with
 * a label and an elapsed timer, then the grid settles into a check or a cross. The status is
 * announced politely to screen readers.
 */
export function LatticeLoader({
  label,
  doneLabel,
  errorLabel,
  status = 'working',
  pattern = 'orbit',
  grid = 3,
  shape = 'round',
  color = 'var(--primary)',
  doneColor = 'var(--success)',
  errorColor = 'var(--danger)',
  cellSize = 6,
  gap = 2,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor,
  showTimer = true,
  elapsed,
  locale,
  className,
  style,
}: LatticeLoaderProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [rootNode, setRootNode] = useState<HTMLSpanElement | null>(null);
  const onScreen = useOnScreen(rootNode);
  const pageVisible = usePageVisible();
  const animationActive = onScreen && pageVisible;

  const size: LatticeGrid = grid === 4 ? 4 : 3;
  const resolved = resolvePattern(pattern, size);
  const stepMs = step * resolved.scale;
  const cycle = Math.round(resolved.loop * stepMs);
  const keyframe = KEYFRAME_NAMES[Math.round(resolved.lit * 100)] ?? 'huitong-lattice-on-62';

  // Tenths of a second since the current working run started.
  const [ticks, setTicks] = useState(0);
  // The mark keeps its last shape while it fades out on a restart.
  const [lastMark, setLastMark] = useState<Mark>('done');
  const [trackedStatus, setTrackedStatus] = useState(status);
  if (trackedStatus !== status) {
    setTrackedStatus(status);
    if (status === 'working') {
      setTicks(0);
    } else {
      setLastMark(status);
    }
  }
  const mark: Mark = status === 'working' ? lastMark : status;

  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'working' || elapsed !== undefined) {
      startedAt.current = null;
      return undefined;
    }
    // The run starts now even if the loader is off-screen; only the ticking pauses.
    const start = (startedAt.current ??= performance.now());
    if (!animationActive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setTicks(Math.floor((performance.now() - start) / 100));
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, [animationActive, elapsed, status]);

  const narrow = useMemo(() => createFormatters(locale, 'narrow'), [locale]);
  const long = useMemo(() => createFormatters(locale, 'long'), [locale]);
  const deciseconds = elapsed === undefined ? ticks : Math.round(Math.max(0, elapsed) * 10);
  const announcement =
    status === 'working'
      ? label
      : [
          status === 'done' ? doneLabel : errorLabel,
          showTimer ? formatDuration(deciseconds, long) : '',
        ]
          .filter(Boolean)
          .join(' ');

  const markColor = mark === 'error' ? errorColor : doneColor;
  const finished = status !== 'working';
  const cellShape = shape === 'round' ? 'rounded-full' : 'rounded-none';
  const fade = reduceMotion ? 'none' : `opacity 200ms ${EASE_OUT}`;
  const gridStyle: CSSProperties = {
    gridArea: '1 / 1',
    gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
    gap,
  };
  const cellBox: CSSProperties = { width: cellSize, height: cellSize };
  const glowFor = (tint: string): CSSProperties =>
    glow ? { boxShadow: `0 0 ${cellSize * 1.2}px ${cellSize * 0.12}px ${tint}` } : {};

  return (
    <span
      ref={setRootNode}
      role="status"
      className={cn('inline-flex items-center gap-2 leading-none', className)}
      data-status={status}
      style={{ '--ll-idle': idleOpacity, ...style } as CSSProperties}
    >
      <span className="grid shrink-0" aria-hidden="true">
        <span
          className="grid"
          data-part="wave"
          data-motion={reduceMotion ? 'still' : animationActive ? 'running' : 'paused'}
          style={{ ...gridStyle, opacity: finished ? 0 : 1, transition: fade }}
        >
          {resolved.cells.map((cell, index) => {
            const base: CSSProperties = { ...cellBox, background: color };
            if (cell === null) {
              return (
                <span
                  key={index}
                  data-hole=""
                  className={cellShape}
                  style={{ ...base, opacity: idleOpacity * 0.47 }}
                />
              );
            }
            const motionStyle: CSSProperties =
              reduceMotion || finished
                ? { opacity: reduceMotion ? STILL_OPACITY : idleOpacity }
                : {
                    opacity: idleOpacity,
                    animation: `${keyframe} ${cycle}ms ${EASE_IN_OUT} ${Math.round(cell * stepMs)}ms infinite`,
                    animationPlayState: animationActive ? 'running' : 'paused',
                  };
            return (
              <span
                key={index}
                className={cellShape}
                style={{ ...base, ...motionStyle, ...glowFor(glowColor ?? color) }}
              />
            );
          })}
        </span>
        <span
          className="grid origin-center"
          data-part="mark"
          style={{
            ...gridStyle,
            opacity: finished ? 1 : 0,
            scale: finished || reduceMotion ? '1' : '0.9',
            transition: reduceMotion
              ? 'none'
              : `opacity 200ms ${EASE_OUT}, scale 200ms ${EASE_OUT}`,
          }}
        >
          {resolved.cells.map((_, index) => {
            const on = MARKS[size][mark].includes(index);
            return (
              <span
                key={index}
                className={cellShape}
                data-on={on ? '' : undefined}
                style={{
                  ...cellBox,
                  background: on ? markColor : color,
                  opacity: on ? 1 : idleOpacity,
                  transition: reduceMotion
                    ? 'none'
                    : `opacity 200ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}`,
                  ...(on ? glowFor(glowColor ?? markColor) : {}),
                }}
              />
            );
          })}
        </span>
      </span>
      <span className="relative inline-block font-medium" aria-hidden="true">
        {(
          [
            ['working', label],
            ['done', doneLabel],
            ['error', errorLabel],
          ] as const
        ).map(([key, text]) => {
          const active = status === key;
          return (
            <span
              key={key}
              data-active={active ? '' : undefined}
              className={cn('whitespace-nowrap', active ? 'static' : 'absolute top-0 left-0')}
              style={{
                opacity: active ? 1 : 0,
                filter: active || reduceMotion ? 'none' : 'blur(2px)',
                transition: reduceMotion
                  ? 'none'
                  : `opacity 200ms ${EASE_OUT}, filter 200ms ${EASE_OUT}`,
              }}
            >
              {text}
            </span>
          );
        })}
      </span>
      {showTimer ? (
        <span className="font-mono text-muted-foreground tabular-nums" aria-hidden="true">
          {formatDuration(deciseconds, narrow)}
        </span>
      ) : null}
      <span className="sr-only">{announcement}</span>
    </span>
  );
}
