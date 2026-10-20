/*
 * React Bits CountUp (free registry item @react-bits/CountUp-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: final value at once under reduced motion, compact units from the locale (K/M or
 * 万/亿) instead of hard-coded English, and screen readers always get the final value, never a mid-count.
 */
'use client';

import { animate, cubicBezier, useInView, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { cn } from '@/lib/utils';

export type CountUpEasing = 'easeOut' | 'linear' | 'expo' | 'spring';

/** Props for {@link CountUp}. */
export interface CountUpProps {
  /** The value counted to; also the value screen readers announce. */
  to: number;
  /** The value counting starts from. */
  from?: number;
  /** `down` counts from `to` back to `from`. */
  direction?: 'up' | 'down';
  /** Seconds to wait before counting. */
  delay?: number;
  /** Seconds the count takes. */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  /** Holds the count until true, for example until the figure has loaded. */
  startWhen?: boolean;
  /** Thousands separator, for example `,`. */
  separator?: string;
  /** Text before the number, such as a translated currency symbol. */
  prefix?: string;
  /** Text after the number, such as `%`. */
  suffix?: string;
  /** `roll` spins each digit like an odometer. */
  mode?: 'count' | 'roll';
  easing?: CountUpEasing;
  /** Fixed decimal places (0 to 20). Defaults to the precision of `from` and `to`. */
  decimals?: number;
  /** `compact` abbreviates with the locale's units: 1.2K in English, 1.2万 in Chinese. */
  format?: 'standard' | 'compact';
  /** BCP 47 locale for compact units. Pass the active i18n language; defaults to `<html lang>`. */
  locale?: string;
  /** Count when scrolled into view, or as soon as it mounts. */
  trigger?: 'view' | 'load';
  /** Replays the count when the pointer enters. Decorative, so off under reduced motion. */
  replayOnHover?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface Column {
  slot: number;
  index: number;
  place: number;
  from: number;
  to: number;
  enter: boolean;
  leave: boolean;
  delta: number;
}

interface Mark {
  char: string;
  enter?: boolean;
  leave?: boolean;
  follow?: number;
}

type Slot = Column | Mark;

interface Roll {
  slots: Slot[];
  columns: Column[];
  label: string;
}

interface Play {
  id: number;
  from: number;
  to: number;
  spin: boolean;
  wait: boolean;
}

interface CompactUnit {
  size: number;
  label: string;
}

interface FormatOptions {
  /** Compact units, largest first; `null` for standard formatting. */
  units: readonly CompactUnit[] | null;
  decimals: number | undefined;
  places: number;
  separator: string;
}

interface Scale {
  size: number;
  label: string;
  digits: number;
}

interface NumberParts {
  negative: boolean;
  int: string;
  frac: string;
}

/** Values the running animation reads, refreshed after every commit. */
interface Live {
  formatValue: (value: number) => string;
  model: Roll | null;
  mode: 'count' | 'roll';
  easing: CountUpEasing;
  duration: number;
  delay: number;
  reduceMotion: boolean;
  onStart: (() => void) | undefined;
  onEnd: (() => void) | undefined;
}

interface RollRendererOptions {
  model: Roll;
  root: HTMLElement;
  slots: readonly (HTMLSpanElement | null)[];
  filters: readonly (SVGFEGaussianBlurElement | null)[];
  filterId: (index: number) => string;
  easing: CountUpEasing;
  total: number;
}

/** Height of one digit cell in roll mode, in em. */
const CELL = 1.2;
const STAGGER = 0.07;
const MAX_DECIMALS = 20;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const mod10 = (value: number) => ((value % 10) + 10) % 10;

/** A critically tuned spring that lands exactly on 1 at t = 1, with the given overshoot. */
function makeSpring(overshoot: number): (t: number) => number {
  const log = Math.log(Math.min(0.5, Math.max(0.001, overshoot)));
  const zeta = -log / Math.sqrt(Math.PI * Math.PI + log * log);
  const damped = Math.PI / 0.52;
  const natural = damped / Math.sqrt(1 - zeta * zeta);
  const raw = (t: number) =>
    1 -
    Math.exp(-zeta * natural * t) *
      (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  const residual = 1 - raw(1);
  return (t: number) => (t >= 1 ? 1 : raw(t) + residual * t * t * t);
}

const EASINGS: Record<CountUpEasing, (t: number) => number> = {
  linear: (t) => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: (t) => (t >= 1 ? 1 : (1 - 2 ** (-10 * t)) / (1 - 2 ** -10)),
  spring: makeSpring(0.06),
};

function decimalPlaces(value: number): number {
  const [, fraction = ''] = value.toString().split('.');
  return /[1-9]/.test(fraction) ? fraction.length : 0;
}

/** The explicit locale, else the document language; `undefined` lets Intl use the browser default. */
function resolveLocale(locale: string | undefined): string | undefined {
  const candidate = locale ?? document.documentElement.lang;
  if (candidate === '') {
    return undefined;
  }
  try {
    return Intl.NumberFormat.supportedLocalesOf(candidate)[0];
  } catch {
    return undefined;
  }
}

const unitCache = new Map<string, readonly CompactUnit[]>();

/** The locale's compact units, largest first, read from Intl: K/M/B/T in English, 万/亿/万亿 in Chinese. */
function compactUnits(locale: string | undefined): readonly CompactUnit[] {
  const key = locale ?? '';
  const cached = unitCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 0,
  });
  const units: CompactUnit[] = [];
  for (let exponent = 3; exponent <= 15; exponent++) {
    const size = 10 ** exponent;
    const parts = formatter.formatToParts(size);
    const label = parts
      .filter((part) => part.type === 'compact')
      .map((part) => part.value)
      .join('');
    const integer = parts
      .filter((part) => part.type === 'integer')
      .map((part) => part.value)
      .join('');
    if (label !== '' && integer === '1') {
      units.unshift({ size, label });
    }
  }
  unitCache.set(key, units);
  return units;
}

function scaleFor(value: number, { units, decimals, places }: FormatOptions): Scale {
  // Switches unit just below the boundary so 999,960 reads 1.0M rather than 1000.0K.
  const unit = units?.find(({ size }) => Math.abs(value) >= size * 0.9995);
  if (!unit) {
    return { size: 1, label: '', digits: places };
  }
  return {
    size: unit.size,
    label: unit.label,
    digits: decimals ?? (Math.abs(value) / unit.size < 100 ? 1 : 0),
  };
}

function splitNumber(value: number, { size, digits }: Scale): NumberParts {
  const fixed = (Math.abs(value) / size).toFixed(digits);
  const [int = '0', frac = ''] = fixed.split('.');
  return { negative: value < 0 && Number(fixed) !== 0, int, frac };
}

const groupThousands = (int: string, separator: string) =>
  separator === '' ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

function formatNumber(value: number, options: FormatOptions): string {
  const scale = scaleFor(value, options);
  const parts = splitNumber(value, scale);
  const fraction = parts.frac === '' ? '' : `.${parts.frac}`;
  const sign = parts.negative ? '-' : '';
  return `${sign}${groupThousands(parts.int, options.separator)}${fraction}${scale.label}`;
}

function digitAt(parts: NumberParts, place: number): number | null {
  if (place < 0) {
    return Number(parts.frac.charAt(-place - 1));
  }
  const index = parts.int.length - 1 - place;
  return index >= 0 ? Number(parts.int.charAt(index)) : null;
}

/** Lays out the odometer columns for a roll from `a` to `b`, and how far each column spins. */
function buildRoll(a: number, b: number, spin: boolean, options: FormatOptions): Roll {
  const scale = scaleFor(b, options);
  const pa = splitNumber(a, scale);
  const pb = splitNumber(b, scale);
  const length = Math.max(pa.int.length, pb.int.length);
  const slots: Slot[] = [];
  const columns: Column[] = [];
  if (pa.negative || pb.negative) {
    slots.push({ char: '-', enter: !pa.negative, leave: !pb.negative });
  }
  for (let place = length - 1; place >= -scale.digits; place--) {
    if (place === -1) {
      slots.push({ char: '.' });
    }
    const start = digitAt(pa, place);
    const end = digitAt(pb, place);
    const column: Column = {
      slot: slots.length,
      index: columns.length,
      place,
      from: start ?? 0,
      to: end ?? 0,
      enter: start === null,
      leave: end === null,
      delta: 0,
    };
    slots.push(column);
    columns.push(column);
    if (options.separator !== '' && place > 0 && place % 3 === 0) {
      slots.push({ char: options.separator, follow: column.index });
    }
  }
  const up = spin || b >= a;
  columns.forEach((column, index) => {
    const rank = columns.length - 1 - index;
    const base = up ? mod10(column.to - column.from) : -mod10(column.from - column.to);
    const turns = spin
      ? Math.max(1, 3 - rank)
      : Math.min(
          Math.floor(Math.abs(b - a) / (scale.size * 10 ** (column.place + 1))),
          Math.max(0, 3 - rank),
        );
    column.delta = base + (up ? 10 : -10) * turns;
  });
  return { slots, columns, label: scale.label };
}

const fade = (node: HTMLSpanElement | null, width: number, presence: number, settled: boolean) => {
  if (!node) {
    return;
  }
  node.style.width = settled ? '' : `${(presence * width).toFixed(2)}px`;
  node.style.opacity = settled ? '' : presence.toFixed(3);
};

/** Returns a frame function that moves the odometer strips, with motion blur scaled to digit speed. */
function createRollRenderer({
  model,
  root,
  slots,
  filters,
  filterId,
  easing,
  total,
}: RollRendererOptions): (t: number) => void {
  const fontSize = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
  const cell = CELL * fontSize;
  const count = model.columns.length;
  const stagger = count > 1 ? Math.min(STAGGER, (total * 0.4) / (count - 1)) : 0;
  const span = Math.max(0.001, total - stagger * (count - 1));
  const columns = model.columns.map((column) => {
    const box = slots[column.slot] ?? null;
    const strip = box?.firstElementChild instanceof HTMLElement ? box.firstElementChild : null;
    return {
      ...column,
      box,
      strip,
      blur: filters[column.index] ?? null,
      cells: strip ? Array.from(strip.children, (cellNode) => cellNode.firstChild) : [],
      width: box?.scrollWidth ?? 0,
      ease:
        easing === 'spring'
          ? makeSpring(Math.min(0.12, Math.max(0.01, 0.35 / Math.max(1, Math.abs(column.delta)))))
          : EASINGS[easing],
      base: Math.floor(column.from),
      sigma: 0,
      presence: column.enter ? 0 : 1,
    };
  });
  const marks: { node: HTMLSpanElement; width: number; mark: Mark }[] = [];
  model.slots.forEach((slot, index) => {
    const node = slots[index];
    const animated =
      'char' in slot && (slot.enter === true || slot.leave === true || slot.follow !== undefined);
    if (node && animated) {
      marks.push({ node, width: node.scrollWidth, mark: slot });
    }
  });

  return (t: number) => {
    columns.forEach((column, index) => {
      const { strip } = column;
      if (!strip) {
        return;
      }
      const u = clamp01((t - index * stagger) / span);
      const position = column.from + column.delta * column.ease(u);
      const base = Math.floor(position);
      if (base !== column.base) {
        column.base = base;
        column.cells.forEach((node, offset) => {
          if (node) {
            node.nodeValue = String(mod10(base + offset - 1));
          }
        });
      }
      strip.style.transform = `translateY(${(-(1 + position - base) * CELL).toFixed(4)}em)`;

      const u0 = Math.max(0, u - 0.004);
      const u1 = Math.min(1, u + 0.004);
      const speed =
        u1 > u0
          ? (Math.abs(column.delta) * Math.abs(column.ease(u1) - column.ease(u0))) /
            (u1 - u0) /
            span
          : 0;
      const sigma = u > 0 && u < 1 ? Math.min(cell * 0.05, (speed * cell) / 600) : 0;
      if (Math.abs(sigma - column.sigma) > 0.05 || (sigma === 0 && column.sigma !== 0)) {
        column.sigma = sigma;
        if (sigma > 0.2 && column.blur) {
          column.blur.setAttribute('stdDeviation', `0 ${sigma.toFixed(2)}`);
          strip.style.filter = `url(#${filterId(index)})`;
        } else {
          strip.style.filter = '';
        }
      }

      if (column.enter || column.leave) {
        column.presence = column.enter ? smooth(0, 0.45, u) : 1 - smooth(0.55, 1, u);
        fade(column.box, column.width, column.presence, column.enter && u >= 1);
      }
    });

    const overall = total > 0 ? clamp01(t / total) : 1;
    marks.forEach(({ node, width, mark }) => {
      if (mark.follow === undefined) {
        const presence =
          mark.enter === true ? smooth(0, 0.3, overall) : 1 - smooth(0.7, 1, overall);
        fade(node, width, presence, mark.enter === true && overall >= 1);
        return;
      }
      const column = columns[mark.follow];
      if (column && (column.enter || column.leave)) {
        fade(node, width, column.presence, column.enter && column.presence >= 1);
      }
    });
  };
}

/**
 * Counts a number up (or down) when it scrolls into view, as plain counting or an odometer roll.
 * Screen readers always get the final value. Under reduced motion the final value shows at once,
 * whatever `trigger` or `startWhen` say, and `onStart`/`onEnd` still fire when the count would start.
 */
export function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className,
  style,
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  mode = 'count',
  easing = 'easeOut',
  decimals,
  format = 'standard',
  locale,
  trigger = 'view',
  replayOnHover = false,
  onStart,
  onEnd,
}: CountUpProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const filterRefs = useRef<(SVGFEGaussianBlurElement | null)[]>([]);
  const liveRef = useRef<Live | null>(null);
  const uid = useId().replace(/[^\w-]/g, '');
  const startValue = direction === 'down' ? to : from;
  const endValue = direction === 'down' ? from : to;
  const valueRef = useRef(startValue);
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const playIdRef = useRef(0);
  const [play, setPlay] = useState<Play | null>(null);
  const isInView = useInView(ref, { once: true });
  const armed = (trigger === 'load' || isInView) && startWhen;

  const fixedDecimals =
    decimals === undefined ? undefined : Math.min(MAX_DECIMALS, Math.max(0, Math.round(decimals)));
  const places = fixedDecimals ?? Math.max(decimalPlaces(from), decimalPlaces(to));
  const units = useMemo(
    () => (format === 'compact' ? compactUnits(resolveLocale(locale)) : null),
    [format, locale],
  );
  const options = useMemo<FormatOptions>(
    () => ({ units, decimals: fixedDecimals, places, separator }),
    [units, fixedDecimals, places, separator],
  );
  const formatValue = useCallback(
    (value: number) => `${prefix}${formatNumber(value, options)}${suffix}`,
    [prefix, suffix, options],
  );

  const model = useMemo(() => {
    if (mode !== 'roll') {
      return null;
    }
    const a = play ? play.from : startValue;
    const b = play ? play.to : endValue;
    return buildRoll(a, b, play?.spin ?? false, options);
  }, [mode, play, startValue, endValue, options]);

  // The count span's text is written imperatively each frame, so React only ever renders this first value.
  const [initialText] = useState(() => formatValue(startValue));

  useLayoutEffect(() => {
    liveRef.current = {
      formatValue,
      model,
      mode,
      easing,
      duration: Math.max(0, duration),
      delay: Math.max(0, delay),
      reduceMotion,
      onStart,
      onEnd,
    };
  });

  // Re-syncs the idle count text; reduceMotion is listed because leaving it remounts the count span.
  useLayoutEffect(() => {
    if (!startedRef.current) {
      valueRef.current = startValue;
    }
    const text = textRef.current;
    if (mode === 'count' && !runningRef.current && text) {
      text.textContent = formatValue(valueRef.current);
    }
  }, [mode, startValue, formatValue, reduceMotion]);

  useEffect(() => {
    if (!armed) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      startedRef.current = true;
      playIdRef.current += 1;
      const settled = liveRef.current?.reduceMotion ?? false;
      setPlay({
        id: playIdRef.current,
        from: settled ? endValue : valueRef.current,
        to: endValue,
        spin: false,
        wait: true,
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [armed, endValue]);

  useEffect(() => {
    const live = liveRef.current;
    const root = ref.current;
    if (!play || !live || !root) {
      return undefined;
    }
    live.onStart?.();
    if (live.reduceMotion) {
      valueRef.current = play.to;
      live.onEnd?.();
      return undefined;
    }

    const ease = EASINGS[live.easing];
    const total = live.duration;
    const valueAt = (t: number) =>
      play.from + (play.to - play.from) * ease(total > 0 ? clamp01(t / total) : 1);
    let render: (t: number) => void;
    if (live.mode === 'roll' && live.model) {
      const draw = createRollRenderer({
        model: live.model,
        root,
        slots: slotRefs.current,
        filters: filterRefs.current,
        filterId: (index) => `${uid}-${index}`,
        easing: live.easing,
        total,
      });
      render = (t) => {
        draw(t);
        valueRef.current = valueAt(t);
      };
    } else {
      render = (t) => {
        const value = valueAt(t);
        valueRef.current = value;
        const text = textRef.current;
        const formatLatest = liveRef.current?.formatValue;
        if (text && formatLatest) {
          text.textContent = formatLatest(value);
        }
      };
    }

    runningRef.current = true;
    const controls = animate(0, total, {
      duration: total,
      delay: play.wait ? live.delay : 0,
      ease: 'linear',
      onUpdate: render,
      onComplete: () => {
        render(Number.POSITIVE_INFINITY);
        valueRef.current = play.to;
        runningRef.current = false;
        liveRef.current?.onEnd?.();
      },
    });
    return () => {
      controls.stop();
      runningRef.current = false;
    };
  }, [play, uid]);

  const replay = () => {
    if (runningRef.current || !startedRef.current) {
      return;
    }
    playIdRef.current += 1;
    const id = playIdRef.current;
    setPlay(
      mode === 'roll'
        ? { id, from: valueRef.current, to: valueRef.current, spin: true, wait: false }
        : { id, from: startValue, to: endValue, spin: false, wait: false },
    );
  };

  const finalText = formatValue(endValue);
  let content;
  if (reduceMotion) {
    content = finalText;
  } else if (model) {
    content = (
      <>
        <span
          key={`roll-${play?.id ?? 0}`}
          aria-hidden="true"
          className="inline-flex whitespace-pre select-none"
        >
          {prefix !== '' && (
            <span className="inline-block h-[1.2em] leading-[1.2em]">{prefix}</span>
          )}
          {model.slots.map((slot, index) => {
            const hidden =
              'char' in slot
                ? slot.enter === true ||
                  (slot.follow !== undefined && model.columns[slot.follow]?.enter === true)
                : slot.enter;
            const collapsed = hidden ? { width: 0, opacity: 0 } : undefined;
            const setSlot = (node: HTMLSpanElement | null) => {
              slotRefs.current[index] = node;
            };
            if ('char' in slot) {
              return (
                <span
                  key={index}
                  ref={setSlot}
                  className="inline-block h-[1.2em] overflow-hidden leading-[1.2em]"
                  style={collapsed}
                >
                  {slot.char}
                </span>
              );
            }
            return (
              <span
                key={index}
                ref={setSlot}
                className="relative inline-block h-[1.2em] overflow-hidden leading-[1.2em]"
                style={collapsed}
              >
                <span className="flex flex-col" style={{ transform: `translateY(${-CELL}em)` }}>
                  {[-1, 0, 1, 2].map((offset) => (
                    <span key={offset} className="h-[1.2em]">
                      {mod10(slot.from + offset)}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
          {model.label !== '' && (
            <span className="inline-block h-[1.2em] leading-[1.2em]">{model.label}</span>
          )}
          {suffix !== '' && (
            <span className="inline-block h-[1.2em] leading-[1.2em]">{suffix}</span>
          )}
        </span>
        <span className="sr-only">{finalText}</span>
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            {model.columns.map((column) => (
              <filter
                key={column.index}
                id={`${uid}-${column.index}`}
                x="-20%"
                y="-50%"
                width="140%"
                height="200%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur
                  ref={(node) => {
                    filterRefs.current[column.index] = node;
                  }}
                  stdDeviation="0 0"
                />
              </filter>
            ))}
          </defs>
        </svg>
      </>
    );
  } else {
    content = (
      <>
        <span key="count" ref={textRef} aria-hidden="true">
          {initialText}
        </span>
        <span className="sr-only">{finalText}</span>
      </>
    );
  }

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      style={style}
      onPointerEnter={replayOnHover && !reduceMotion ? replay : undefined}
    >
      {content}
    </span>
  );
}
