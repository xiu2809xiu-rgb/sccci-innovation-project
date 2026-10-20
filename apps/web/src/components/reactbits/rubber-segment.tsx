/*
 * React Bits RubberSegment (free registry item @react-bits/RubberSegment-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours with full-contrast inactive labels, sizes on the type scale, the global
 * focus ring, a required accessible name, and an instant jump with no stretch or squash under reduced motion.
 */
'use client';

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export type RubberSegmentSize = 'sm' | 'md' | 'lg';

export interface RubberSegmentItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface RubberSegmentProps {
  items: RubberSegmentItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  /** Accessible name of the radio group, e.g. "Theme". */
  'aria-label': string;
  trackColor?: string;
  thumbColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: RubberSegmentSize;
  radius?: number;
  inset?: number;
  equalSlots?: boolean;
  /** 0-100: how far the thumb stretches towards its target before landing. */
  stretch?: number;
  squash?: number;
  speed?: number;
  glide?: number;
  draggable?: boolean;
  disabled?: boolean;
  className?: string;
}

interface Slot {
  l: number;
  r: number;
}
type Sample = [time: number, x: number];
interface Drag {
  id: number;
  x0: number;
  slot: number;
  onThumb: boolean;
  live: boolean;
  offset: number;
  w: number;
  hist: Sample[];
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 };
const SPRING_MOMENTUM = { type: 'spring' as const, duration: 0.4, bounce: 0.2 };
const SPRING_RELAX = { type: 'spring' as const, duration: 0.16, bounce: 0 };
const DILATE = 0.19;
const HANDOFF = 0.15;
const FLICK = 110;
const MAX_VELOCITY = 2000;
const DEADZONE = 4;
const SLOP = 10;
const RUBBER = 0.55;
const SIZES: Record<RubberSegmentSize, { height: number; text: string; pad: number; min: number }> =
  {
    sm: { height: 28, text: 'text-xs', pad: 10, min: 36 },
    md: { height: 32, text: 'text-sm', pad: 12, min: 44 },
    lg: { height: 36, text: 'text-base', pad: 16, min: 48 },
  };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rubber = (over: number, dim: number) =>
  (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over));
const project = (velocity: number, glide: number) => {
  const d = 1 - 0.1 * Math.pow(0.05, glide / 100);
  return ((velocity / 1000) * d) / (1 - d);
};
const velocityOf = (hist: Sample[], now: number) => {
  const recent = hist.filter(([time]) => now - time <= 100);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || recent.length < 2) return 0;
  const [t0, x0] = first;
  const [t1, x1] = last;
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
};
const centreOf = (slot: Slot) => (slot.l + slot.r) / 2;
const nearestSlot = (slots: Slot[], x: number) => {
  let best = 0;
  slots.forEach((slot, i) => {
    const current = slots[best];
    if (current && Math.abs(centreOf(slot) - x) < Math.abs(centreOf(current) - x)) best = i;
  });
  return best;
};

/** A segmented control (`role="radiogroup"`) whose thumb stretches between options; arrows, Home and End move it. */
export function RubberSegment({
  items,
  value,
  defaultValue,
  onChange,
  'aria-label': ariaLabel,
  trackColor = 'var(--muted)',
  thumbColor = 'var(--card)',
  textColor = 'var(--muted-foreground)',
  activeTextColor = 'var(--foreground)',
  size = 'md',
  radius = 6,
  inset = 2,
  equalSlots = true,
  stretch = 100,
  squash = 3,
  speed = 1,
  glide = 75,
  draggable = true,
  disabled = false,
  className,
}: RubberSegmentProps) {
  const [inner, setInner] = useState<string | undefined>(defaultValue ?? items[0]?.value);
  const current = value ?? inner;
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === current),
  );
  const reduce = useReducedMotion() === true;

  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<Slot[]>([]);
  const box = useRef<DOMRect | null>(null);
  const committed = useRef(index);
  const handoff = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<Drag | null>(null);
  const gen = useRef(0);

  const edgeL = useMotionValue(0);
  const edgeR = useMotionValue(0);
  const innerW = useMotionValue(0);
  const thumbRadius = Math.max(0, radius - inset);
  const clipPath = useTransform(
    () =>
      `inset(0 ${String(Math.max(0, innerW.get() - edgeR.get()))}px 0 ${String(Math.max(0, edgeL.get()))}px round ${String(thumbRadius)}px)`,
  );

  const scaled = (seconds: number) => seconds / speed;

  const jumpTo = (i: number) => {
    const slot = slots.current[i];
    if (!slot) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    edgeL.jump(slot.l);
    edgeR.jump(slot.r);
  };

  const measure = useEffectEvent(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    box.current = rect;
    slots.current = items.map((_, i) => {
      const el = itemRefs.current[i];
      if (!el) return { l: 0, r: 0 };
      const r = el.getBoundingClientRect();
      return { l: r.left - rect.left - inset, r: r.right - rect.left - inset };
    });
    innerW.set(rect.width - inset * 2);
    jumpTo(committed.current);
  });

  const listKey = items.map((item) => item.value).join('|');
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(() => {
      measure();
    });
    if (trackRef.current) observer.observe(trackRef.current);
    // Web fonts change label widths once loaded (and jsdom has no font loading at all).
    if ('fonts' in document) {
      void document.fonts.ready.then(() => {
        measure();
      });
    }
    return () => {
      observer.disconnect();
    };
  }, [listKey, size, inset, equalSlots]);

  useEffect(() => {
    if (!drag.current && committed.current !== index) {
      committed.current = index;
      jumpTo(index);
    }
  });

  useEffect(
    () => () => {
      clearTimeout(handoff.current);
      edgeL.stop();
      edgeR.stop();
    },
    [edgeL, edgeR],
  );

  const commit = (i: number) => {
    committed.current = i;
    const item = items[i];
    if (i === index || !item) return;
    if (value === undefined) setInner(item.value);
    onChange?.(item.value, i);
  };

  const land = (to: number, velocity: number | null, flick: boolean, withSquash: boolean) => {
    const target = slots.current[to];
    if (!target) return;
    const generation = ++gen.current;
    const dir = Math.sign(centreOf(target) - (edgeL.get() + edgeR.get()) / 2) || 1;
    const [lead, leadTo, trail, trailTo] =
      dir > 0 ? [edgeR, target.r, edgeL, target.l] : [edgeL, target.l, edgeR, target.r];
    const velocityFor = (motionValue: MotionValue<number>) =>
      clamp(velocity ?? motionValue.getVelocity(), -MAX_VELOCITY, MAX_VELOCITY);
    animate(lead, leadTo, {
      ...(flick ? SPRING_MOMENTUM : SPRING_UI),
      duration: scaled(flick ? 0.4 : 0.3),
      velocity: velocityFor(lead),
    });
    const trailVelocity = velocityFor(trail);
    if (!withSquash || squash <= 0) {
      animate(trail, trailTo, { ...SPRING_UI, duration: scaled(0.3), velocity: trailVelocity });
      return;
    }
    void animate(trail, trailTo + dir * squash, {
      ...SPRING_UI,
      duration: scaled(0.3),
      velocity: trailVelocity,
    }).then(() => {
      if (gen.current === generation)
        animate(trail, trailTo, { ...SPRING_RELAX, duration: scaled(0.16) });
    });
  };

  const travel = (from: number, to: number) => {
    const a = slots.current[from];
    const b = slots.current[to];
    if (!a || !b) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    if (reduce) {
      edgeL.jump(b.l);
      edgeR.jump(b.r);
      return;
    }
    const u = stretch / 100;
    const tween = { duration: scaled(DILATE), ease: EASE_OUT };
    animate(edgeL, b.l + (Math.min(a.l, b.l) - b.l) * u, tween);
    animate(edgeR, b.r + (Math.max(a.r, b.r) - b.r) * u, tween);
    handoff.current = setTimeout(
      () => {
        land(to, null, false, true);
      },
      scaled(HANDOFF) * 1000,
    );
  };

  const localX = (event: { clientX: number }) => event.clientX - (box.current?.left ?? 0) - inset;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, i: number) => {
    if (disabled || drag.current || event.button !== 0) return;
    box.current = trackRef.current?.getBoundingClientRect() ?? null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture fails when the pointer is already gone; a tap still works.
    }
    const x = localX(event);
    const onThumb = draggable && x >= edgeL.get() && x <= edgeR.get();
    drag.current = {
      id: event.pointerId,
      x0: x,
      slot: i,
      onThumb,
      live: false,
      offset: 0,
      w: 0,
      hist: [[event.timeStamp, x]],
    };
    if (onThumb) {
      clearTimeout(handoff.current);
      gen.current += 1;
      edgeL.stop();
      edgeR.stop();
    } else if (!reduce) {
      event.currentTarget.dataset.pressed = '';
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== event.pointerId || !d.onThumb) return;
    const x = localX(event);
    d.hist.push([event.timeStamp, x]);
    if (d.hist.length > 8) d.hist.shift();
    if (!d.live) {
      if (Math.abs(x - d.x0) < DEADZONE) return;
      d.live = true;
      d.offset = x - edgeL.get();
      d.w = edgeR.get() - edgeL.get();
      if (trackRef.current) trackRef.current.dataset.held = '';
    }
    const width = innerW.get();
    const l = x - d.offset;
    const maxL = width - d.w;
    if (reduce) {
      const c = clamp(l, 0, maxL);
      edgeL.set(c);
      edgeR.set(c + d.w);
    } else if (l < 0) {
      edgeL.set(0);
      edgeR.set(d.w - rubber(-l, d.w));
    } else if (l > maxL) {
      edgeR.set(width);
      edgeL.set(maxL + rubber(l - maxL, d.w));
    } else {
      edgeL.set(l);
      edgeR.set(l + d.w);
    }
  };

  const release = (d: Drag) => {
    drag.current = null;
    if (trackRef.current) delete trackRef.current.dataset.held;
    const el = itemRefs.current[d.slot];
    if (el) delete el.dataset.pressed;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== event.pointerId) return;
    release(d);
    const x = localX(event);
    if (!d.live) {
      if (Math.abs(x - d.x0) <= SLOP && d.slot !== committed.current) {
        const from = committed.current;
        commit(d.slot);
        travel(from, d.slot);
      }
      return;
    }
    const velocity = velocityOf(d.hist, event.timeStamp);
    const flick = Math.abs(velocity) > FLICK;
    let to = nearestSlot(slots.current, (edgeL.get() + edgeR.get()) / 2 + project(velocity, glide));
    if (flick && to === committed.current)
      to = clamp(to + Math.sign(velocity), 0, items.length - 1);
    commit(to);
    if (reduce) jumpTo(to);
    else land(to, velocity, flick, flick);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== event.pointerId) return;
    release(d);
    if (!d.live) return;
    if (reduce) jumpTo(committed.current);
    else land(committed.current, null, false, false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const last = items.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(last, index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    if (next === index) return;
    commit(next);
    jumpTo(next);
    itemRefs.current[next]?.focus();
  };

  const preset = SIZES[size];
  const segmentClass = cn(
    'm-0 inline-flex h-[calc(var(--rs-h)-var(--rs-inset)*2)] min-w-[var(--rs-min)] items-center justify-center gap-1.5 rounded-[var(--rs-thumb-radius)] border-0 bg-transparent px-[var(--rs-pad)] py-0 leading-none font-medium whitespace-nowrap',
    preset.text,
  );

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      data-equal={equalSlots ? '' : undefined}
      data-draggable={draggable && !disabled ? '' : undefined}
      className={cn(
        'group relative inline-grid touch-pan-y auto-cols-auto grid-flow-col rounded-[var(--rs-radius)] p-[var(--rs-inset)] align-middle select-none [-webkit-tap-highlight-color:transparent] [background:var(--rs-track)] aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[equal]:auto-cols-[minmax(0,1fr)] data-[held]:cursor-grabbing',
        className,
      )}
      style={
        {
          '--rs-track': trackColor,
          '--rs-thumb': thumbColor,
          '--rs-ink': textColor,
          '--rs-ink-active': activeTextColor,
          '--rs-radius': `${String(radius)}px`,
          '--rs-inset': `${String(inset)}px`,
          '--rs-thumb-radius': `${String(thumbRadius)}px`,
          '--rs-h': `${String(preset.height)}px`,
          '--rs-pad': `${String(preset.pad)}px`,
          '--rs-min': `${String(preset.min)}px`,
        } as CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {items.map((item, i) => (
        <button
          key={item.value}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          className={cn(
            segmentClass,
            'cursor-pointer [color:var(--rs-ink)] [transition:color_150ms_var(--ease-out),transform_150ms_var(--ease-out)] group-data-[held]:cursor-grabbing hover:[color:var(--rs-ink-active)] aria-checked:cursor-default group-data-[draggable]:aria-checked:cursor-grab data-[pressed]:[transform:scale(0.96)] motion-reduce:[transition:none]',
          )}
          onPointerDown={(event) => {
            handlePointerDown(event, i);
          }}
          onKeyDown={handleKeyDown}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <motion.div
        className="pointer-events-none absolute inset-[var(--rs-inset)] grid auto-cols-auto grid-flow-col [color:var(--rs-ink-active)] shadow-xs [background:var(--rs-thumb)] group-data-[equal]:auto-cols-[minmax(0,1fr)]"
        aria-hidden="true"
        style={{ clipPath }}
      >
        {items.map((item) => (
          <span key={item.value} className={cn(segmentClass, 'cursor-default [color:inherit]')}>
            {item.icon}
            {item.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
