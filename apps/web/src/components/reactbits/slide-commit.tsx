/*
 * React Bits SlideCommit (free registry item @react-bits/SlideCommit-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours, the control radius, a width that follows its container, Lucide icons,
 * translated labels from the caller, and a two-tap path for pointers that cannot drag (WCAG 2.5.7): a tap
 * arms the control, a second tap within four seconds commits. Enter and Space do the same from the keyboard.
 */
'use client';

import { ArrowRight, Check } from 'lucide-react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { cn } from '@/lib/utils';

export type SlideCommitPhase = 'idle' | 'armed' | 'pending' | 'done' | 'error';

export interface SlideCommitProps {
  /** Also the slider's accessible name, e.g. "Slide to apply 3 changes". */
  label: string;
  armedLabel: string;
  workingLabel: string;
  doneLabel: string;
  errorLabel: string;
  /** May return a promise: the control shows a spinner until it settles. */
  onConfirm: () => unknown;
  height?: number;
  disabled?: boolean;
  className?: string;
}

const PAD = 4;
const RADIUS = 8;
const ARM_RATIO = 0.42;
const ARM_MS = 4000;
const TAP_SLOP = 4;
const MIN_PENDING_MS = 300;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SHAKE = [0, -5, 5, -3, 3, -1, 0];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Slide (or tap twice) to commit an action that was previewed first. */
export function SlideCommit({
  label,
  armedLabel,
  workingLabel,
  doneLabel,
  errorLabel,
  onConfirm,
  height = 40,
  disabled = false,
  className,
}: SlideCommitProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<SlideCommitPhase>('idle');
  const [width, setWidth] = useState(320);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const grip = useRef<{ id: number; grab: number | null; startX: number; moved: boolean } | null>(
    null,
  );
  const armTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const run = useRef(0);

  const gripSize = height - PAD * 2;
  const inner = width - PAD * 2;
  const travel = Math.max(1, inner - gripSize);
  const gripRadius = RADIUS - PAD / 2;
  const spring = {
    type: 'spring' as const,
    stiffness: 600,
    damping: 2 * Math.sqrt(600 * 0.9),
    mass: 0.9,
  };

  const x = useMotionValue(0);
  const shake = useMotionValue(0);
  const seen = useTransform(x, (value) => clamp(value, 0, travel));
  const edge = useTransform(seen, (value) => value + gripSize);
  const clip = useTransform(
    edge,
    (right) => `inset(0 ${String(inner - right)}px 0 0 round ${String(gripRadius)}px)`,
  );
  const labelOpacity = useTransform(seen, [0, travel * 0.55], [1, 0]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      setWidth(Math.max(160, root.clientWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, []);

  useMotionValueEvent(seen, 'change', (value) => {
    const percent = Math.round((value / travel) * 100);
    capsuleRef.current?.setAttribute('aria-valuenow', String(percent));
  });

  useEffect(
    () => () => {
      clearTimeout(armTimer.current);
      run.current += 1;
    },
    [],
  );

  const moveTo = (target: number) => {
    if (reduce) x.set(target);
    else animate(x, target, spring);
  };

  const disarm = () => {
    clearTimeout(armTimer.current);
    setPhase((current) => (current === 'armed' ? 'idle' : current));
    moveTo(0);
  };

  const arm = () => {
    setPhase('armed');
    moveTo(travel * ARM_RATIO);
    clearTimeout(armTimer.current);
    armTimer.current = setTimeout(disarm, ARM_MS);
  };

  const commit = () => {
    clearTimeout(armTimer.current);
    const id = ++run.current;
    x.set(travel);
    setPhase('pending');
    const startedAt = performance.now();
    const later = (settle: () => void) => {
      setTimeout(
        () => {
          if (id === run.current) settle();
        },
        Math.max(0, MIN_PENDING_MS - (performance.now() - startedAt)),
      );
    };
    Promise.resolve()
      .then(onConfirm)
      .then(
        () => {
          later(() => {
            setPhase('done');
          });
        },
        () => {
          later(() => {
            setPhase('error');
            if (!reduce) animate(shake, SHAKE, { duration: 0.45, ease: EASE_OUT });
            moveTo(0);
            setTimeout(() => {
              if (id === run.current) setPhase('idle');
            }, 2000);
          });
        },
      );
  };

  const busy = disabled || phase === 'pending' || phase === 'done';

  const localX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect ? clientX - rect.left : 0;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (busy || grip.current || event.button !== 0) return;
    x.stop();
    grip.current = { id: event.pointerId, grab: null, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = grip.current;
    if (current?.id !== event.pointerId) return;
    if (!current.moved && Math.abs(event.clientX - current.startX) < TAP_SLOP) return;
    if (!current.moved) {
      current.moved = true;
      clearTimeout(armTimer.current);
      setPhase((value) => (value === 'armed' ? 'idle' : value));
    }
    const at = localX(event.clientX);
    current.grab ??= at - x.get();
    x.set(clamp(at - current.grab, 0, travel));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = grip.current;
    if (current?.id !== event.pointerId) return;
    grip.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!current.moved) {
      if (phase === 'armed') commit();
      else arm();
    } else if (x.get() >= travel - 1) commit();
    else moveTo(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (busy) return;
    const step = travel / 10;
    if (event.key === 'End') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (phase === 'armed') commit();
      else arm();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.min(travel, x.get() + step);
      x.set(next);
      if (next >= travel) commit();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      x.set(Math.max(0, x.get() - step));
    } else if (event.key === 'Home' || event.key === 'Escape') {
      event.preventDefault();
      disarm();
    }
  };

  const status =
    phase === 'armed'
      ? armedLabel
      : phase === 'pending'
        ? workingLabel
        : phase === 'done'
          ? doneLabel
          : phase === 'error'
            ? errorLabel
            : '';

  return (
    <div
      ref={rootRef}
      className={cn('group relative w-full max-w-sm data-[disabled]:opacity-55', className)}
      data-phase={phase}
      data-disabled={disabled ? '' : undefined}
      style={{ height }}
    >
      <motion.div
        ref={trackRef}
        className="relative h-full w-full cursor-grab touch-none rounded-lg bg-muted select-none group-data-[disabled]:pointer-events-none group-data-[phase=done]:cursor-default group-data-[phase=pending]:cursor-default"
        style={{ x: shake }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <motion.span
          className="pointer-events-none absolute inset-0 grid place-items-center pl-10 text-sm font-medium whitespace-nowrap text-muted-foreground group-data-[phase=error]:text-danger"
          style={{ opacity: phase === 'armed' ? 0 : labelOpacity }}
          aria-hidden="true"
        >
          {phase === 'error' ? errorLabel : label}
        </motion.span>
        <span
          className="pointer-events-none absolute inset-y-0 right-3 hidden items-center text-sm font-medium text-foreground group-data-[phase=armed]:flex"
          aria-hidden="true"
        >
          {armedLabel}
        </span>
        <motion.div
          ref={capsuleRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={status || label}
          aria-busy={phase === 'pending' || undefined}
          aria-disabled={disabled || undefined}
          className="absolute bg-primary text-primary-foreground transition-colors duration-200 outline-none group-data-[phase=done]:bg-success group-data-[phase=error]:bg-danger focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{
            top: PAD,
            left: PAD,
            width: inner,
            height: gripSize,
            borderRadius: gripRadius,
            clipPath: clip,
          }}
          onKeyDown={onKeyDown}
        >
          <motion.span
            className="pointer-events-none absolute inset-y-0 flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap [&_svg]:size-4"
            style={{ left: seen, width: gripSize }}
            aria-hidden="true"
          >
            {phase === 'pending' ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-pulse" />
            ) : phase === 'done' ? null : (
              <ArrowRight />
            )}
          </motion.span>
          {phase === 'done' ? (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold [&_svg]:size-4"
              aria-hidden="true"
            >
              <Check />
              {doneLabel}
            </span>
          ) : null}
        </motion.div>
      </motion.div>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
