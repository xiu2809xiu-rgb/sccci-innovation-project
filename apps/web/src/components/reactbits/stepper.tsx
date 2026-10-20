/*
 * React Bits Stepper (free registry item @react-bits/Stepper-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: card and muted tokens instead of the glass frame, Lucide icons, translated step
 * labels from the caller, controlled steps with the actions inside each step (so every step keeps one
 * primary button), and a cross-fade without slide or spring under reduced motion. The dots, bars and
 * vertical layouts and the built-in footer were not needed and are left out.
 */
'use client';

import { Check } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  Children,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export interface StepProps {
  title: string;
  children?: ReactNode;
}

/** One step of a {@link Stepper}; its children are the step's content. */
export function Step({ children }: StepProps) {
  return <div className="min-w-0">{children}</div>;
}

export interface StepperProps {
  /** 1-based; one past the last step shows `completedContent`. */
  step: number;
  onStepChange?: (step: number) => void;
  /** Steps after the furthest one reached cannot be chosen. */
  linear?: boolean;
  /** Accessible name for a step indicator, e.g. "Step 2 of 3: Review". */
  stepLabel: (step: number, total: number, title: string) => string;
  /** Accessible name of the step list. */
  'aria-label': string;
  completedContent?: ReactNode;
  disableStepIndicators?: boolean;
  children: ReactNode;
  className?: string;
}

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** The tick draws itself in once; under reduced motion it is simply there. */
function AnimatedCheck({ still }: { still: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const path = ref.current?.querySelector('path');
    if (!path || still) return;
    path.style.strokeDasharray = '24';
    path.animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], {
      duration: 360,
      easing: SETTLE,
    });
  }, [still]);
  return (
    <span ref={ref} className="grid place-items-center [&_svg]:size-3.5">
      <Check strokeWidth={2.6} />
    </span>
  );
}

/** Numbered steps with a sliding highlight; the content cross-fades between steps. */
export function Stepper({
  step,
  onStepChange,
  linear = true,
  stepLabel,
  'aria-label': ariaLabel,
  completedContent,
  disableStepIndicators = false,
  children,
  className,
}: StepperProps) {
  const reduce = useReducedMotion() ?? false;
  const steps = Children.toArray(children).filter(isValidElement) as ReactElement<StepProps>[];
  const total = steps.length;
  const current = Math.min(Math.max(1, Math.round(step)), total + 1);
  const completed = current > total;
  const [reached, setReached] = useState(current);
  if (current > reached) setReached(current);

  const trackRef = useRef<HTMLOListElement>(null);
  const gliderRef = useRef<HTMLSpanElement>(null);
  const markerRefs = useRef<(HTMLElement | null)[]>([]);
  const paneRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const previous = useRef(current);

  const reachable = (number: number) =>
    !disableStepIndicators && number !== current && (!linear || number <= Math.min(reached, total));

  useLayoutEffect(() => {
    const track = trackRef.current;
    const glider = gliderRef.current;
    if (!track || !glider) return undefined;
    const place = (glide: boolean) => {
      const marker = markerRefs.current[Math.min(current, total) - 1];
      if (!marker) return;
      glider.style.transition = glide
        ? `transform 560ms ${SPRING}, width 560ms ${SPRING}, opacity 200ms ease`
        : 'opacity 200ms ease';
      glider.style.transform = `translate3d(${String(marker.offsetLeft)}px, ${String(marker.offsetTop)}px, 0)`;
      glider.style.width = `${String(marker.offsetWidth)}px`;
      glider.style.height = `${String(marker.offsetHeight)}px`;
      glider.style.opacity = completed ? '0' : '1';
    };
    place(placed.current && !reduce);
    placed.current = true;
    const observer = new ResizeObserver(() => {
      place(false);
    });
    observer.observe(track);
    return () => {
      observer.disconnect();
    };
  }, [current, total, completed, reduce]);

  useLayoutEffect(() => {
    const pane = paneRef.current;
    const direction = Math.sign(current - previous.current);
    previous.current = current;
    if (!pane || direction === 0) return;
    // Keyboard and screen-reader users continue from the new step, not from the button they pressed.
    pane.focus({ preventScroll: true });
    if (reduce) {
      pane.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: SETTLE });
    } else {
      pane.animate(
        [
          { opacity: 0, transform: `translateX(${String(direction * 24)}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, easing: SETTLE },
      );
    }
  }, [current, reduce]);

  return (
    <div className={cn('flex min-w-0 flex-col gap-6', className)}>
      <ol
        ref={trackRef}
        aria-label={ariaLabel}
        className="relative flex gap-1 rounded-lg bg-muted p-1"
      >
        <span
          ref={gliderRef}
          className="pointer-events-none absolute top-0 left-0 rounded-md bg-card opacity-0 shadow-[var(--elevation-xs)] ring-1 ring-border"
          aria-hidden="true"
        />
        {steps.map((entry, index) => {
          const number = index + 1;
          const status =
            completed || number < current ? 'complete' : number === current ? 'active' : 'upcoming';
          return (
            <li key={number} className="flex min-w-0 flex-1">
              <button
                ref={(element) => {
                  markerRefs.current[index] = element;
                }}
                type="button"
                className={cn(
                  'relative flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:cursor-pointer enabled:hover:bg-card/60 disabled:cursor-default',
                  status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
                aria-label={stepLabel(number, total, entry.props.title)}
                aria-current={number === current ? 'step' : undefined}
                disabled={!reachable(number)}
                onClick={() => {
                  onStepChange?.(number);
                }}
              >
                <span
                  className={cn(
                    'grid size-5.5 flex-none place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-150',
                    status === 'complete' && 'bg-primary text-primary-foreground',
                    status === 'active' && 'text-foreground ring-[1.5px] ring-foreground',
                    status === 'upcoming' && 'text-muted-foreground ring-1 ring-border-strong',
                  )}
                  aria-hidden="true"
                >
                  {status === 'complete' ? <AnimatedCheck still={reduce} /> : number}
                </span>
                <span className="truncate" aria-hidden="true">
                  {entry.props.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div ref={paneRef} className="min-w-0 outline-none" tabIndex={-1}>
        {completed ? completedContent : steps[current - 1]}
      </div>
    </div>
  );
}
