/*
 * React Bits CallChip (free registry item @react-bits/CallChip-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token colours, the chip radius, Lucide icons, translated status words and a
 * locale-aware timer from the caller, and no shake or wipe under reduced motion.
 */
'use client';

import { Check, RotateCw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

export type CallChipStatus = 'idle' | 'running' | 'done' | 'error';

export interface CallChipProps {
  icon: ReactNode;
  name: string;
  argument?: string;
  status: CallChipStatus;
  /** How long the call usually takes; the progress wash fills to 90 % over this time. */
  expectedMs?: number;
  /** Translated status words for the live region, e.g. { running: 'running', done: 'done' }. */
  statusText: Record<CallChipStatus, string>;
  formatElapsed: (ms: number) => string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

type Glyph = 'tool' | 'check' | 'retry';

const HOLD_AT = 0.9;
const SHAKE = [0, -1, 1, -0.66, 0.66, -0.33, 0];
const GLYPH =
  'absolute inset-0 grid place-items-center opacity-0 blur-[3px] [transform:translateY(70%)] data-[state=in]:opacity-100 data-[state=in]:blur-0 data-[state=in]:[transform:none] data-[state=in]:transition-[opacity,transform,filter] data-[state=in]:duration-250 data-[state=out]:[transform:translateY(-70%)] data-[state=out]:transition-[opacity,transform,filter] data-[state=out]:duration-150 group-data-[status=done]:data-[state=in]:text-success group-data-[status=error]:data-[state=in]:text-danger motion-reduce:transform-none! motion-reduce:filter-none!';

const glyphOf = (status: CallChipStatus): Glyph =>
  status === 'done' ? 'check' : status === 'error' ? 'retry' : 'tool';

/** A live chip for one AI or system call: running with a progress wash, then done or failed. */
export function CallChip({
  icon,
  name,
  argument,
  status,
  expectedMs = 2500,
  statusText,
  formatElapsed,
  retryLabel,
  onRetry,
  className,
}: CallChipProps) {
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const [glyphs, setGlyphs] = useState<{ current: Glyph; previous: Glyph | null }>({
    current: glyphOf(status),
    previous: null,
  });
  const [announce, setAnnounce] = useState('');

  if (glyphOf(status) !== glyphs.current) {
    setGlyphs({ current: glyphOf(status), previous: glyphs.current });
  }

  useLayoutEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    const set = (transform: string, instant: boolean) => {
      if (instant) fill.style.transition = 'none';
      fill.style.transform = transform;
      if (instant) {
        void fill.getBoundingClientRect();
        fill.style.transition = '';
      }
    };
    if (status === 'running') {
      set('scaleX(0)', true);
      set(`scaleX(${String(HOLD_AT)})`, false);
    } else if (status === 'done') {
      set('scaleX(1)', false);
    } else if (status === 'error') {
      // Freeze the wash where its transition had got to; the computed value is that moment's matrix.
      const now = getComputedStyle(fill).transform;
      set(now === '' || now === 'none' ? 'scaleX(0)' : now, true);
      if (!reduce) {
        rootRef.current?.animate(
          SHAKE.map((offset) => ({ transform: `translateX(${String(offset * 6)}px)` })),
          { duration: 450, composite: 'add' },
        );
      }
    } else {
      set('scaleX(0)', true);
    }
  }, [status, reduce]);

  useEffect(() => {
    const write = (ms: number) => {
      elapsed.current = ms;
      if (timerRef.current) timerRef.current.textContent = formatElapsed(ms);
    };
    if (status !== 'running') {
      if (status === 'idle' && timerRef.current) timerRef.current.textContent = '—';
      return undefined;
    }
    const startedAt = performance.now();
    write(0);
    const id = setInterval(() => {
      write(performance.now() - startedAt);
    }, 100);
    return () => {
      clearInterval(id);
      write(performance.now() - startedAt);
    };
  }, [status, formatElapsed]);

  useEffect(() => {
    const ms = Math.round(elapsed.current);
    const when = status === 'done' || status === 'error' ? `, ${formatElapsed(ms)}` : '';
    setAnnounce(`${name}${argument ? ` ${argument}` : ''}: ${statusText[status]}${when}`);
  }, [status, name, argument, statusText, formatElapsed]);

  const glyphState = (glyph: Glyph) =>
    glyph === glyphs.current ? 'in' : glyph === glyphs.previous ? 'out' : undefined;

  return (
    <span
      ref={rootRef}
      role="status"
      aria-busy={status === 'running' || undefined}
      data-status={status}
      className={cn(
        'group relative inline-flex h-8 items-center gap-2 overflow-hidden rounded-md border border-border bg-muted px-3 text-sm leading-none whitespace-nowrap text-foreground select-none',
        className,
      )}
      style={{ '--cc-expected': `${String(expectedMs)}ms` } as CSSProperties}
    >
      <span
        ref={fillRef}
        className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-primary/10 group-data-[status=done]:bg-success-subtle group-data-[status=done]:transition-[transform,background-color] group-data-[status=done]:duration-200 group-data-[status=error]:bg-danger-subtle group-data-[status=running]:[transition:transform_var(--cc-expected)_linear]"
        aria-hidden="true"
      />
      <span className="relative size-4 flex-none overflow-hidden [&_svg]:size-4" aria-hidden="true">
        <span className={GLYPH} data-state={glyphState('tool')}>
          {icon}
        </span>
        <span className={GLYPH} data-state={glyphState('check')}>
          <Check />
        </span>
        <span className={GLYPH} data-state={glyphState('retry')}>
          <RotateCw />
        </span>
      </span>
      <span className="relative font-medium" aria-hidden="true">
        {name}
      </span>
      {argument ? (
        <span className="relative font-mono text-xs text-muted-foreground" aria-hidden="true">
          {argument}
        </span>
      ) : null}
      <span
        ref={timerRef}
        className="relative min-w-[6ch] text-right text-xs text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
        —
      </span>
      {status === 'error' && onRetry ? (
        <button
          type="button"
          className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={retryLabel ?? name}
          onClick={onRetry}
        />
      ) : null}
      <span className="sr-only">{announce}</span>
    </span>
  );
}
