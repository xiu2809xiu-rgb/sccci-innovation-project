/*
 * React Bits ThoughtLine (free registry item @react-bits/ThoughtLine-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours with the AI glyph in the accent, Lucide icons, translated labels and a
 * locale-aware timer from the caller, trace lines that wrap (rationales are sentences), motion that stops
 * after five seconds (WCAG 2.2.2), and none at all under reduced motion.
 */
'use client';

import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useAutoplayWindow } from '@/hooks/use-autoplay-window';
import { cn } from '@/lib/utils';

import './thought-line.css';

export interface ThoughtLineProps {
  /** Shown while working, e.g. "Comparing the two systems…". */
  label: string;
  /** Shown once settled, before the timer, e.g. "Explained in". */
  doneLabel: string;
  /** Lines revealed under the label; collapsible once settled. */
  steps?: readonly ReactNode[];
  working: boolean;
  showTimer?: boolean;
  /** A duration in the UI language, e.g. "38 ms" or "1.2 秒". */
  formatElapsed?: (milliseconds: number) => string;
  /**
   * The call's measured duration, shown once settled. Without it the line shows
   * its own count, which only ticks every 100 ms (a fast call would read 0).
   */
  elapsedMs?: number;
  /** Start expanded once settled (rationales the reader asked to see). */
  defaultOpen?: boolean;
  className?: string;
}

const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const DEFAULT_ELAPSED = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)}s`;

/** An AI step that breathes while it works, then settles into a line that opens its trace. */
export function ThoughtLine({
  label,
  doneLabel,
  steps = [],
  working,
  showTimer = true,
  formatElapsed = DEFAULT_ELAPSED,
  elapsedMs,
  defaultOpen = false,
  className,
}: ThoughtLineProps) {
  const reduce = useReducedMotion() ?? false;
  // WCAG 2.2.2: the shimmer and breathing stop after five seconds even if the call is still running.
  const animated = useAutoplayWindow(working) && !reduce;
  const [open, setOpen] = useState(working || defaultOpen);
  const [ticked, setTicked] = useState(0);
  const [wasWorking, setWasWorking] = useState(working);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const traceId = useId();
  const hasTrace = steps.length > 0;
  const toggle = hasTrace && !working;

  // Reset during render when work starts or ends, so no frame shows the previous state.
  if (working !== wasWorking) {
    setWasWorking(working);
    setOpen(working || defaultOpen);
    if (working) setTicked(0);
  }

  useEffect(() => {
    const glyph = glyphRef.current;
    if (!glyph) return undefined;
    const running: AnimationPlaybackControls[] = [];
    if (animated) {
      running.push(
        animate(
          glyph,
          { opacity: [0.55, 1, 0.55] },
          { duration: 1.6, ease: EASE_IN_OUT, repeat: Infinity },
        ),
      );
    } else {
      running.push(
        animate(glyph, { opacity: working ? 1 : 0.7 }, { duration: 0.35, ease: EASE_OUT }),
      );
    }
    return () => {
      running.forEach((animation) => {
        animation.stop();
      });
    };
  }, [animated, working]);

  useEffect(() => {
    if (!working) return undefined;
    const startedAt = performance.now();
    const id = setInterval(() => {
      setTicked(Math.floor((performance.now() - startedAt) / 100) * 100);
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [working]);

  const elapsed = formatElapsed(!working && elapsedMs !== undefined ? elapsedMs : ticked);
  const announce = working ? label : showTimer ? `${doneLabel} ${elapsed}` : doneLabel;

  const head = (
    <>
      <span
        ref={glyphRef}
        className="inline-flex size-4 flex-none text-primary [&_svg]:size-4"
        aria-hidden="true"
      >
        <Sparkles />
      </span>
      <span aria-hidden="true" className={cn(animated && 'thought-line-shimmer')}>
        {working ? label : doneLabel}
      </span>
      {showTimer ? (
        <span className="text-muted-foreground tabular-nums" aria-hidden="true">
          {elapsed}
        </span>
      ) : null}
      {toggle ? (
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      ) : null}
      <span className="sr-only" role="status">
        {announce}
      </span>
    </>
  );

  return (
    <div className={cn('flex flex-col items-start text-sm', className)}>
      {toggle ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md text-left font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-expanded={open}
          aria-controls={traceId}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {head}
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">{head}</div>
      )}
      {hasTrace ? (
        <div
          id={traceId}
          className="grid w-full grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out data-[open]:grid-rows-[1fr] motion-reduce:transition-none"
          data-open={open ? '' : undefined}
          inert={!open}
        >
          <div className="min-h-0 overflow-hidden">
            <ul className="flex max-w-prose flex-col gap-1.5 pt-2 pl-5.5 text-sm text-muted-foreground">
              {steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 flex-none opacity-60" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
