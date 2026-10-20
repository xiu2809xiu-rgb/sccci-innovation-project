/*
 * React Bits AnimatedList (free registry item @react-bits/AnimatedList-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong as a read-only feed: a labelled <ul> (the original listbox selection, hover-select and
 * gliding ring are removed), token colours and Lucide-friendly icon slots, rows that spring in when the list
 * scrolls into view or when new entries arrive, scroll-edge fades, and no movement under reduced motion.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react';

import { cn } from '@/lib/utils';

export interface AnimatedListEntry {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
}

export type AnimatedListAnimation = 'pop' | 'slide' | 'fade';

export interface AnimatedListProps {
  items: AnimatedListEntry[];
  /** Accessible name of the list, e.g. "Recent activity". */
  'aria-label': string;
  animation?: AnimatedListAnimation;
  /** Seconds between rows on the first reveal. */
  stagger?: number;
  maxHeight?: number | string;
  showGradients?: boolean;
  /** Height in pixels of the scroll-edge fades. */
  fadeSize?: number;
  renderItem?: (item: AnimatedListEntry) => ReactNode;
  className?: string;
}

const HIDDEN: Record<AnimatedListAnimation, string> = {
  pop: 'translate3d(0, 12px, 0) scale(0.92)',
  slide: 'translate3d(0, 24px, 0)',
  fade: 'translate3d(0, 4px, 0)',
};

/** A sampled spring with a little overshoot, for rows settling into place. */
const SPRING_EASE =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// Masks only read alpha, so these black steps describe transparency, not a visible colour.
const FADE_MASK = (() => {
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
  const top = steps.map(
    (t) => `rgb(0 0 0 / ${smootherstep(t).toFixed(3)}) calc(var(--al-fade-top) * ${String(t)})`,
  );
  const bottom = [...steps]
    .reverse()
    .map(
      (t) =>
        `rgb(0 0 0 / ${smootherstep(t).toFixed(3)}) calc(100% - var(--al-fade-bottom) * ${String(t)})`,
    );
  return `linear-gradient(to bottom, ${[...top, ...bottom].join(', ')})`;
})();

const cssSize = (value: number | string) =>
  typeof value === 'number' ? `${String(value)}px` : value;

function DefaultRow({ item }: { item: AnimatedListEntry }) {
  return (
    <>
      {item.icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
          {item.icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
        {item.description ? (
          <span className="truncate text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </span>
      {item.meta ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.meta}</span>
      ) : null}
    </>
  );
}

interface RowProps {
  ready: boolean;
  animate: boolean;
  pose: string;
  delay: number;
  children: ReactNode;
}

/** One row: hidden in its start pose until the list is ready, then springs to rest on the next frame. */
function Row({ ready, animate, pose, delay, children }: RowProps) {
  const [entered, setEntered] = useState(!animate);

  useLayoutEffect(() => {
    if (!ready || entered) return undefined;
    const frame = requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [ready, entered]);

  const style: CSSProperties | undefined = animate
    ? {
        transform: entered ? undefined : pose,
        opacity: entered ? undefined : 0,
        transition: `transform 520ms ${SPRING_EASE}, opacity 200ms var(--ease-out)`,
        transitionDelay: entered ? `${delay.toFixed(3)}s` : '0s',
      }
    : undefined;

  return (
    <li className="flex items-start gap-3 rounded-md px-2 py-2" style={style}>
      {children}
    </li>
  );
}

/** A scrollable feed whose rows spring into view: the overview's activity list. */
export function AnimatedList({
  items,
  'aria-label': ariaLabel,
  animation = 'pop',
  stagger = 0.04,
  maxHeight = 360,
  showGradients = true,
  fadeSize = 32,
  renderItem,
  className,
}: AnimatedListProps) {
  const reduce = useReducedMotion() === true;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Rows present at the first render are staggered on reveal; rows that arrive later enter at once.
  const [firstWave] = useState(() => new Set(items.map((item) => item.id)));

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || ready) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(viewport);
    return () => {
      observer.disconnect();
    };
  }, [ready]);

  const updateFades = (viewport: HTMLDivElement) => {
    const span = Math.max(1, fadeSize);
    const top = Math.min(span, Math.max(0, viewport.scrollTop));
    const bottom = Math.min(
      span,
      Math.max(0, viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop),
    );
    viewport.style.setProperty('--al-fade-top', `${top.toFixed(1)}px`);
    viewport.style.setProperty('--al-fade-bottom', `${bottom.toFixed(1)}px`);
    // A list that scrolls must be reachable from the keyboard to scroll it (WCAG 2.1.1);
    // one that fits needs no extra tab stop.
    if (viewport.scrollHeight > viewport.clientHeight + 1) {
      viewport.setAttribute('tabindex', '0');
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-label', ariaLabel);
    } else {
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-label');
    }
  };

  useLayoutEffect(() => {
    if (viewportRef.current) updateFades(viewportRef.current);
  });

  let order = 0;

  return (
    <div
      ref={viewportRef}
      className={cn(
        '[scrollbar-width:thin] overflow-x-hidden overflow-y-auto overscroll-contain [--al-fade-bottom:0px] [--al-fade-top:0px]',
        className,
      )}
      style={{
        maxHeight: cssSize(maxHeight),
        maskImage: showGradients ? FADE_MASK : undefined,
      }}
      onScroll={(event: UIEvent<HTMLDivElement>) => {
        updateFades(event.currentTarget);
      }}
    >
      <ul aria-label={ariaLabel} className="flex flex-col gap-1">
        {items.map((item) => {
          const staggered = firstWave.has(item.id);
          const delay = staggered ? order++ * Math.max(0, stagger) : 0;
          return (
            <Row
              key={item.id}
              ready={ready}
              animate={!reduce}
              pose={HIDDEN[animation]}
              delay={delay}
            >
              {renderItem ? renderItem(item) : <DefaultRow item={item} />}
            </Row>
          );
        })}
      </ul>
    </div>
  );
}
