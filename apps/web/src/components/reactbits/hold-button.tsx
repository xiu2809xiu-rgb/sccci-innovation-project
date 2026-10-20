/*
 * React Bits HoldButton (free registry item @react-bits/HoldButton-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: primary-button tokens and sizes, the global focus ring, a translated hold hint from
 * the caller, no glow, and a fill that fades in place of the wave under reduced motion.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

import './hold-button.css';

export interface HoldButtonProps {
  children: ReactNode;
  doneLabel: ReactNode;
  /** Read to screen readers with the button, e.g. "Press and hold for 1.2 seconds to confirm". */
  holdHint: string;
  icon?: ReactNode;
  doneIcon?: ReactNode;
  holdTime?: number;
  releaseTime?: number;
  /** Delay before the button returns to idle after confirming; 0 keeps it done. */
  resetAfter?: number;
  disabled?: boolean;
  onHold?: () => void;
  /** A press shorter than a tap: a cue to explain that the button needs holding. */
  onTap?: () => void;
  className?: string;
}

type Phase = 'idle' | 'holding' | 'done';
type Input = 'pointer' | 'key' | null;

const TAP_MS = 250;
const HIT_PAD = 10;
const WAVE_PX = 5;
const linear = (t: number) => t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const LABEL =
  '[grid-area:1/1] inline-flex items-center gap-1.5 whitespace-nowrap transition-[opacity,filter] duration-200';

/** Press and hold to confirm (pointer, Space or Enter); a quick press only calls `onTap`. */
export function HoldButton({
  children,
  doneLabel,
  holdHint,
  icon,
  doneIcon,
  holdTime = 1200,
  releaseTime = 200,
  resetAfter = 0,
  disabled = false,
  onHold,
  onTap,
  className,
}: HoldButtonProps) {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>('idle');
  const [input, setInput] = useState<Input>(null);
  const phaseRef = useRef<Phase>('idle');
  const inputRef = useRef<Input>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ pointerId: number | null; start: number; rect: DOMRect | null }>({
    pointerId: null,
    start: 0,
    rect: null,
  });
  const timers = useRef({ complete: 0, reset: 0 });
  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 });
  const hintId = useId();

  const go = (next: Phase, kind: Input = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const clearTimers = () => {
    clearTimeout(timers.current.complete);
    clearTimeout(timers.current.reset);
  };

  const drive = (to: number, duration: number, ease: (t: number) => number) => {
    const m = motion.current;
    cancelAnimationFrame(m.raf);
    m.from = m.p;
    m.to = to;
    // Timed from the first frame: animation frames and events share the page's clock.
    m.start = -1;
    const step = (now: number) => {
      if (m.start < 0) m.start = now;
      const t = duration > 0 ? Math.min(1, (now - m.start) / duration) : 1;
      m.p = m.from + (m.to - m.from) * ease(t);
      buttonRef.current?.style.setProperty('--hb-p', m.p.toFixed(4));
      if (t < 1) {
        m.raf = requestAnimationFrame(step);
        return;
      }
      m.raf = 0;
      if (m.to === 1) complete(now);
    };
    m.raf = requestAnimationFrame(step);
  };

  const complete = (now: number) => {
    if (phaseRef.current !== 'holding') return;
    if (now - gesture.current.start < holdTime - 50) return;
    clearTimers();
    go('done', inputRef.current);
    onHold?.();
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        go('idle');
        drive(0, releaseTime, easeOut);
      }, resetAfter);
    }
  };

  const begin = (kind: Input, at: number) => {
    if (disabled || phaseRef.current !== 'idle' || !buttonRef.current) return false;
    gesture.current.start = at;
    gesture.current.rect = buttonRef.current.getBoundingClientRect();
    go('holding', kind);
    drive(1, holdTime, linear);
    // Backstop for background tabs, where animation frames stop.
    timers.current.complete = window.setTimeout(() => {
      complete(at + holdTime + 100);
    }, holdTime + 100);
    return true;
  };

  const release = (at: number, { drifted = false }: { drifted?: boolean } = {}) => {
    if (phaseRef.current !== 'holding') return;
    clearTimers();
    const held = at - gesture.current.start;
    go('idle');
    drive(0, releaseTime, easeOut);
    if (!drifted && held < TAP_MS) onTap?.();
  };
  const releaseRef = useRef(release);
  useLayoutEffect(() => {
    releaseRef.current = release;
  });

  const endPointer = (event: PointerEvent<HTMLButtonElement>, drifted = false) => {
    if (event.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    release(event.timeStamp, { drifted });
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin('pointer', event.timeStamp)) return;
    gesture.current.pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = gesture.current.rect;
    if (event.pointerId !== gesture.current.pointerId || !rect) return;
    const outside =
      event.clientX < rect.left - HIT_PAD ||
      event.clientX > rect.right + HIT_PAD ||
      event.clientY < rect.top - HIT_PAD ||
      event.clientY > rect.bottom + HIT_PAD;
    if (outside) endPointer(event, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (inputRef.current === 'key') release(event.timeStamp, { drifted: true });
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) begin('key', event.timeStamp);
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && inputRef.current === 'key') {
      event.preventDefault();
      release(event.timeStamp);
    }
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    const measure = () => {
      button.style.setProperty('--hb-w', `${String(button.offsetWidth)}px`);
      button.style.setProperty('--hb-h', `${String(button.offsetHeight)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'holding') return undefined;
    // Leaving the window mid-hold must never confirm.
    const cancel = () => {
      releaseRef.current(gesture.current.start, { drifted: true });
    };
    const onVisibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  useEffect(() => {
    const pending = timers.current;
    const animation = motion.current;
    return () => {
      clearTimeout(pending.complete);
      clearTimeout(pending.reset);
      cancelAnimationFrame(animation.raf);
    };
  }, []);

  const labels = (
    <>
      <span
        className={cn(
          LABEL,
          'group-data-[phase=done]:opacity-0 group-data-[phase=done]:blur-[2px]',
        )}
        aria-hidden={phase === 'done'}
      >
        {icon}
        {children}
      </span>
      <span
        className={cn(
          LABEL,
          'group-data-[phase=done]:blur-0 opacity-0 blur-[2px] group-data-[phase=done]:opacity-100',
        )}
        aria-hidden={phase !== 'done'}
      >
        {doneIcon}
        {doneLabel}
      </span>
    </>
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={cn(
        'hb-root group relative isolate inline-grid h-8 cursor-pointer touch-manipulation place-items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]',
        'transition-[transform,background-color] duration-150 ease-out hover:bg-primary-hover data-[input=pointer]:data-[phase=holding]:scale-[0.98] motion-reduce:transform-none',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      data-phase={phase}
      data-input={input ?? undefined}
      data-motion={reduce ? 'still' : undefined}
      aria-describedby={hintId}
      style={
        {
          '--hb-hold': `${String(holdTime)}ms`,
          '--hb-cycles': holdTime / 1100,
          '--hb-release': `${String(releaseTime)}ms`,
          '--hb-wave': `${String(WAVE_PX)}px`,
          '--hb-p': 0,
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        endPointer(event);
      }}
      onPointerCancel={(event) => {
        endPointer(event, true);
      }}
      onLostPointerCapture={(event) => {
        endPointer(event, true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') endPointer(event, true);
      }}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <span className="hb-label relative z-[2] grid place-items-center">{labels}</span>
      <span
        className="pointer-events-none absolute inset-0 z-[3] overflow-hidden rounded-[inherit]"
        aria-hidden="true"
      >
        <span className="hb-fill absolute inset-0 grid place-items-center bg-[color-mix(in_oklch,var(--primary),var(--foreground)_28%)] text-primary-foreground">
          <span className="hb-label grid place-items-center">{labels}</span>
        </span>
        <span className="hb-crest absolute inset-0 grid place-items-center bg-[color-mix(in_oklch,var(--primary),var(--foreground)_28%)] text-primary-foreground">
          <span className="hb-label grid place-items-center">{labels}</span>
        </span>
      </span>
      {/* Hidden, so it is read once as the description and not again in the name. */}
      <span id={hintId} hidden>
        {holdHint}
      </span>
    </button>
  );
}
