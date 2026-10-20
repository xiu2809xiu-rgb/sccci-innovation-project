/*
 * React Bits SquishSwitch (free registry item @react-bits/SquishSwitch-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours with a 3:1 track boundary, UI-density default size, an accessible name
 * enforced by the props type, the global focus ring, and no swell or stretch under reduced motion.
 */
'use client';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { cn } from '@/lib/utils';

interface SquishSwitchBaseProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  trackColor?: string;
  trackOnColor?: string;
  thumbColor?: string;
  thumbOnColor?: string;
  width?: number;
  height?: number;
  radius?: number;
  /** 0-100: how quickly the thumb travels. */
  speed?: number;
  /** 0-100: how much the thumb stretches while moving fast. */
  stretch?: number;
  hoverScale?: number;
  colorDuration?: number;
  className?: string;
  id?: string;
}

/** A switch needs an accessible name: a visible `label`, or `ariaLabel` when the label lives elsewhere. */
export type SquishSwitchProps = SquishSwitchBaseProps &
  ({ label: string; ariaLabel?: string } | { label?: undefined; ariaLabel: string });

interface Grip {
  id: number;
  grab: number | null;
  moved: boolean;
  startX: number;
  onAtPress: boolean;
  slop: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const FLOW_SPRING = { stiffness: 320, damping: 40, mass: 0.6 };
const SWELL_SPRING = { stiffness: 520, damping: 34, mass: 0.6 };
const MAX_STRETCH = 0.4;
const STRETCH_SPEED = 600;
const TAP_SLOP = { fine: 4, coarse: 8 };

/** A `role="switch"` toggle whose thumb squashes as it travels; drag, click, Space and Enter all work. */
export function SquishSwitch({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  trackColor = 'var(--input)',
  trackOnColor = 'var(--primary)',
  thumbColor = 'var(--card)',
  thumbOnColor = 'var(--primary-foreground)',
  width = 40,
  height = 22,
  radius = 11,
  speed = 50,
  stretch = 36,
  hoverScale = 1.035,
  colorDuration = 200,
  ariaLabel,
  className,
  id,
}: SquishSwitchProps) {
  const reduce = useReducedMotion() === true;
  const inset = Math.max(2, Math.round(height * 0.11));
  const thumb = height - inset * 2;
  const min = inset;
  const max = width - inset - thumb;
  const mid = (min + max) / 2;
  const trackRadius = Math.min(radius, height / 2);
  const thumbRadius = Math.max(2, trackRadius - inset);

  const isControlled = checked !== undefined;
  const [inner, setInner] = useState(defaultChecked);
  const on = isControlled ? checked : inner;
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLSpanElement>(null);
  const grip = useRef<Grip | null>(null);
  const onRef = useRef(on);
  const skipClick = useRef(false);
  const autoId = useId();
  const buttonId = id ?? autoId;

  useLayoutEffect(() => {
    onRef.current = on;
  }, [on]);

  const x = useMotionValue(on ? max : min);
  const flow = useSpring(useVelocity(x), FLOW_SPRING);
  const swell = useSpring(1, SWELL_SPRING);
  const gain = reduce ? 0 : clamp(stretch, 0, 100) / 100;
  const stretchOf = (velocity: number) =>
    1 + Math.min(MAX_STRETCH, Math.abs(velocity) / STRETCH_SPEED) * gain;
  const scaleX = useTransform(
    [flow, swell],
    ([velocity = 0, held = 1]: number[]) => stretchOf(velocity) * held,
  );
  const scaleY = useTransform(
    [flow, swell],
    ([velocity = 0, held = 1]: number[]) => held / stretchOf(velocity),
  );

  const commit = (next: boolean) => {
    if (next === onRef.current) return;
    onRef.current = next;
    if (!isControlled) setInner(next);
    onChange?.(next);
  };

  useEffect(() => {
    if (dragging) return undefined;
    const target = on ? max : min;
    if (reduce) {
      x.jump(target);
      return undefined;
    }
    const controls = animate(x, target, {
      type: 'spring',
      stiffness: 170 - (50 - clamp(speed, 0, 100)) * 1.1,
      damping: 21.5,
      mass: 0.9,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
    return () => {
      controls.stop();
    };
  }, [on, dragging, min, max, speed, reduce, x]);

  const localX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / (el.offsetWidth > 0 ? el.offsetWidth : rect.width) || 1;
    return (clientX - rect.left) / scale;
  };

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || grip.current || event.button !== 0) return;
    grip.current = {
      id: event.pointerId,
      grab: null,
      moved: false,
      startX: event.clientX,
      onAtPress: onRef.current,
      slop: event.pointerType === 'touch' ? TAP_SLOP.coarse : TAP_SLOP.fine,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture fails when the pointer is already gone; the drag still works without it.
    }
    setDragging(true);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const g = grip.current;
    if (g?.id !== event.pointerId) return;
    const lx = localX(event.clientX);
    if (g.grab === null) {
      g.grab = lx - x.get();
      return;
    }
    if (!g.moved && Math.abs(event.clientX - g.startX) > g.slop) g.moved = true;
    if (!g.moved) return;
    const nx = clamp(lx - g.grab, min, max);
    x.set(nx);
    commit(nx > mid);
  };

  const up = (
    event: { pointerId: number; currentTarget: HTMLButtonElement },
    cancelled: boolean,
  ) => {
    const g = grip.current;
    if (g?.id !== event.pointerId) return;
    grip.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Already released.
    }
    if (cancelled) commit(g.onAtPress);
    else if (!g.moved) commit(!onRef.current);
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    setDragging(false);
  };

  const click = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!disabled) commit(!onRef.current);
  };

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <button
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className="group relative m-0 inline-block cursor-pointer touch-pan-y rounded-full border-0 bg-transparent p-0 select-none [-webkit-tap-highlight-color:transparent] after:absolute after:-inset-2 after:content-[''] aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[held]:cursor-grabbing"
        data-on={on ? '' : undefined}
        data-held={dragging ? '' : undefined}
        style={
          {
            '--ss-w': `${String(width)}px`,
            '--ss-h': `${String(height)}px`,
            '--ss-inset': `${String(inset)}px`,
            '--ss-thumb': `${String(thumb)}px`,
            '--ss-r': `${String(trackRadius)}px`,
            '--ss-thumb-r': `${String(thumbRadius)}px`,
            '--ss-track': trackColor,
            '--ss-track-on': trackOnColor,
            '--ss-thumb-color': thumbColor,
            '--ss-thumb-on': thumbOnColor,
            '--ss-fade': `${String(colorDuration)}ms`,
          } as CSSProperties
        }
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(event) => {
          up(event, false);
        }}
        onPointerCancel={(event) => {
          up(event, true);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse' && !disabled && !reduce) swell.set(hoverScale);
        }}
        onPointerLeave={() => {
          swell.set(1);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === 'Escape' && grip.current) {
            up({ pointerId: grip.current.id, currentTarget: event.currentTarget }, true);
          }
        }}
        onClick={click}
      >
        <span
          ref={trackRef}
          className="relative block [height:var(--ss-h)] [width:var(--ss-w)] [border-radius:var(--ss-r)] [background:var(--ss-track)] [transition:background-color_var(--ss-fade)_ease-out] group-data-[on]:[background:var(--ss-track-on)] motion-reduce:[transition-duration:1ms]"
        >
          <motion.span
            className="absolute [top:var(--ss-inset)] left-0 [height:var(--ss-thumb)] [width:var(--ss-thumb)] [border-radius:var(--ss-thumb-r)] shadow-xs [background:var(--ss-thumb-color)] [transition:background-color_var(--ss-fade)_ease-out] group-data-[on]:[background:var(--ss-thumb-on)] motion-reduce:[transition-duration:1ms]"
            aria-hidden="true"
            style={{ x, scaleX, scaleY }}
          />
        </span>
      </button>
      {label ? (
        <label htmlFor={buttonId} className="cursor-pointer text-sm text-foreground select-none">
          {label}
        </label>
      ) : null}
    </span>
  );
}
