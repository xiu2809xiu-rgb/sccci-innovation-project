/*
 * React Bits StatusMark (free registry item @react-bits/StatusMark-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours, translated status text from the caller, a still frame under
 * reduced motion, and a spinner that pauses while off-screen or in a hidden tab.
 */
'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export type StatusMarkStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

/** Props for {@link StatusMark}. */
export interface StatusMarkProps {
  /** State of the task the mark stands for. */
  status?: StatusMarkStatus;
  /** 0 to 1. While running, a number draws a determinate arc instead of the spinner. */
  progress?: number;
  /**
   * Accessible name of the current status, already translated, e.g. `t('workflow.status.running')`.
   * Include the percentage when `progress` is set.
   */
  statusText: string;
  /** Optional visible label beside the mark, already translated. */
  label?: ReactNode;
  /** Mark colour while pending or cancelled. Any CSS colour. */
  color?: string;
  /** Mark colour while running. Any CSS colour. */
  runningColor?: string;
  /** Mark colour when done. Any CSS colour. */
  doneColor?: string;
  /** Mark colour when failed. Any CSS colour. */
  errorColor?: string;
  /** Rendered size of the mark in pixels. */
  size?: number;
  /** Stroke width in the 24-unit view box. */
  strokeWidth?: number;
  /** Number of dashes in the idle ring. */
  dashes?: number;
  /** Milliseconds per spinner revolution. */
  spinDuration?: number;
  /** Share of the ring the spinner arc covers, 0 to 1. */
  arcLength?: number;
  /** Milliseconds to draw the check or cross. */
  drawDuration?: number;
  /** Fill strength of the disc behind a done or failed mark, 0 to 1. */
  fillOpacity?: number;
  /** Strike through the label once done. */
  strike?: boolean;
  /** Extra milliseconds before the strike-through starts. */
  strikeDelay?: number;
  className?: string;
  style?: CSSProperties;
}

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Ring morphs are UI transitions (200 ms ease-out); the arc length settles with a short spring. */
const MORPH = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
const ARC_SPRING = { type: 'spring' as const, duration: 0.25, bounce: 0 };
const CHECK = 'M7.5 12.25 10.5 15.25 16.75 8.75';
const CROSS = 'M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5';
/** Share of each dash period that is drawn while idle. */
const IDLE_DASH = 0.3;
/** The check or cross starts drawing once the ring has mostly closed. */
const DRAW_DELAY = 120;
const TRACK_OPACITY = 0.2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

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

/** Inline styles that draw a check or cross in (or hide it), with or without motion. */
function markStyle(visible: boolean, reduceMotion: boolean, drawDuration: number): CSSProperties {
  if (reduceMotion) {
    return { opacity: visible ? 1 : 0, transition: 'none' };
  }
  return {
    opacity: visible ? 1 : 0,
    transition: visible
      ? `stroke-dashoffset ${drawDuration}ms ${EASE_OUT} ${DRAW_DELAY}ms, opacity 0ms linear ${DRAW_DELAY}ms`
      : `stroke-dashoffset 150ms ${EASE_OUT}, opacity 0ms linear 150ms`,
  };
}

/**
 * A compact task-status icon: a dashed ring while pending, a spinner or progress arc while running,
 * and a drawn check or cross when the task ends. Pair it with a visible `label` in lists, or let
 * `statusText` name it on its own.
 */
export function StatusMark({
  status = 'pending',
  progress,
  statusText,
  label,
  color = 'var(--muted-foreground)',
  runningColor = 'var(--primary)',
  doneColor = 'var(--success)',
  errorColor = 'var(--danger)',
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  spinDuration = 1100,
  arcLength = 0.68,
  drawDuration = 200,
  fillOpacity = 0.08,
  strike = false,
  strikeDelay = 60,
  className,
  style,
}: StatusMarkProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);
  const onScreen = useOnScreen(svgNode);
  const pageVisible = usePageVisible();

  const radius = 10 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const period = circumference / Math.max(1, dashes);
  const progressValue =
    typeof progress === 'number' && Number.isFinite(progress) ? clamp01(progress) : undefined;
  const running = status === 'running';
  const determinate = running && progressValue !== undefined;
  const indeterminate = running && progressValue === undefined;
  const solid = running || status === 'done' || status === 'failed';
  const targetArc = running ? (progressValue ?? arcLength) : 1;
  const animationActive = onScreen && pageVisible;

  // mode morphs the dashed idle ring (0) into one solid arc (1); arc is that arc's share of the ring.
  const mode = useMotionValue(solid ? 1 : 0);
  const arc = useMotionValue(targetArc);
  const travel = useMotionValue(0);
  const dashArray = useTransform(() => {
    const blend = mode.get();
    const share = arc.get();
    const idleDash = IDLE_DASH * period;
    const idleGap = (1 - IDLE_DASH) * period;
    const dash = idleDash + (share * circumference - idleDash) * blend;
    const gap = idleGap + ((1 - share) * circumference - idleGap) * blend;
    return `${Math.max(0, dash).toFixed(3)} ${Math.max(0, gap).toFixed(3)}`;
  });

  useEffect(() => {
    if (reduceMotion) {
      mode.jump(solid ? 1 : 0);
      arc.jump(targetArc);
      return undefined;
    }
    // Coming from the idle ring, start the arc at its target so only the dash morph animates.
    if (mode.get() === 0) {
      arc.jump(targetArc);
    }
    const morph = animate(mode, solid ? 1 : 0, MORPH);
    const grow = animate(arc, targetArc, ARC_SPRING);
    return () => {
      morph.stop();
      grow.stop();
    };
  }, [arc, mode, reduceMotion, solid, targetArc]);

  useEffect(() => {
    if (reduceMotion) {
      travel.jump(0);
      return undefined;
    }
    if (indeterminate) {
      if (!animationActive) {
        return undefined;
      }
      const start = travel.get();
      const spin = animate(travel, [start, start - circumference], {
        duration: spinDuration / 1000,
        ease: 'linear',
        repeat: Infinity,
      });
      return () => {
        spin.stop();
      };
    }
    // Settle on the nearest dash boundary so the ring does not jump, then reset the offset.
    const unit = determinate ? circumference : period;
    const settle = animate(travel, Math.floor(travel.get() / unit) * unit, {
      ...ARC_SPRING,
      onComplete: () => {
        travel.jump(0);
      },
    });
    return () => {
      settle.stop();
    };
  }, [
    animationActive,
    circumference,
    determinate,
    indeterminate,
    period,
    reduceMotion,
    spinDuration,
    travel,
  ]);

  const tone =
    status === 'done'
      ? doneColor
      : status === 'failed'
        ? errorColor
        : running
          ? runningColor
          : color;
  const hasLabel = label !== undefined && label !== null;
  const struck = strike && status === 'done';
  const colourTransition = reduceMotion ? undefined : 'transition-colors duration-200 ease-out';

  return (
    <span
      className={cn('inline-flex items-center gap-2 align-middle', className)}
      data-status={status}
      style={style}
    >
      <svg
        ref={setSvgNode}
        className={cn('shrink-0 overflow-visible', colourTransition)}
        style={{ color: tone }}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role={hasLabel ? undefined : 'img'}
        aria-label={hasLabel ? undefined : statusText}
        aria-hidden={hasLabel ? true : undefined}
      >
        <g transform="rotate(-90 12 12)">
          <circle
            cx={12}
            cy={12}
            r={radius}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            style={{
              fillOpacity: status === 'done' || status === 'failed' ? fillOpacity : 0,
              strokeOpacity: running ? TRACK_OPACITY : 0,
              transition: reduceMotion
                ? 'none'
                : `fill-opacity 200ms ${EASE_OUT}, stroke-opacity 200ms ${EASE_OUT}`,
            }}
          />
          <motion.circle
            data-part="ring"
            cx={12}
            cy={12}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={travel}
          />
        </g>
        <path
          data-part="check"
          d={CHECK}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 2"
          strokeDashoffset={status === 'done' || reduceMotion ? 0 : 1.05}
          style={markStyle(status === 'done', reduceMotion, drawDuration)}
        />
        <path
          data-part="cross"
          d={CROSS}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 2"
          strokeDashoffset={
            status === 'failed' || status === 'cancelled' || reduceMotion ? 0 : 1.05
          }
          style={markStyle(
            status === 'failed' || status === 'cancelled',
            reduceMotion,
            drawDuration,
          )}
        />
      </svg>
      {hasLabel ? (
        <>
          <span className="sr-only">{statusText}</span>{' '}
          <span
            className={cn(
              'relative',
              running || status === 'failed' ? 'text-foreground' : 'text-muted-foreground',
              colourTransition,
            )}
          >
            {label}
            {strike ? (
              <span
                data-part="strike"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2 bg-current"
                style={{
                  scale: struck ? '1 1' : '0 1',
                  transition: reduceMotion
                    ? 'none'
                    : struck
                      ? `scale 250ms ${EASE_OUT} ${DRAW_DELAY + strikeDelay}ms`
                      : `scale 150ms ${EASE_OUT}`,
                }}
              />
            ) : null}
          </span>
        </>
      ) : null}
    </span>
  );
}
