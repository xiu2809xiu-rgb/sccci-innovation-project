/*
 * React Bits BlurText (free registry item @react-bits/BlurText-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: renders a real heading via `as`, splits Chinese with Intl.Segmenter so lines wrap,
 * plays once (no loop, no pointer-only replay), and shows the plain text under reduced motion.
 */
'use client';

import {
  motion,
  useReducedMotion,
  type Easing,
  type MotionStyle,
  type Transition,
} from 'motion/react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type Snapshot = Record<string, string | number>;
type Keyframes = Record<string, (string | number)[]>;
type Direction = 'top' | 'bottom' | 'left' | 'right';

export type BlurTextEffect = 'blur' | 'zoom' | 'tilt' | 'focus' | 'drift';
export type BlurTextStaggerFrom = 'start' | 'center' | 'end' | 'random';
/** `load` plays on mount (above the fold); `view` waits until the text scrolls into view. */
export type BlurTextTrigger = 'view' | 'load';

export interface BlurTextProps {
  text: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  /** Milliseconds between pieces. */
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: Direction;
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  blur?: number;
  distance?: number;
  effect?: BlurTextEffect;
  staggerFrom?: BlurTextStaggerFrom;
  trigger?: BlurTextTrigger;
}

interface EffectConfig {
  from: Snapshot;
  rest: Snapshot;
  fade: Easing;
  bounce: number | null;
  settle: number;
  origin?: { originX: number; originY: number };
}

interface Piece {
  word: number;
  content: string;
  key: string;
}

const AXES: Record<Direction, ['x' | 'y', number]> = {
  top: ['y', -1],
  bottom: ['y', 1],
  left: ['x', -1],
  right: ['x', 1],
};

const EASE_OUT: Easing = [0.22, 1, 0.36, 1];
const EASE_IN_OUT: Easing = [0.65, 0, 0.35, 1];
const MOVE_KEYS = ['x', 'y', 'scale', 'rotateX', 'rotateY', 'skewX'];
const NBSP = String.fromCharCode(0xa0);

const blurTo = (px: number) => `blur(${String(Math.max(0, px))}px)`;

function buildEffect(
  effect: BlurTextEffect,
  direction: Direction,
  blur: number,
  distance: number,
): EffectConfig {
  const [axis, sign] = AXES[direction];
  const b = Math.max(0, blur);
  const d = distance;
  switch (effect) {
    case 'zoom':
      return {
        from: { filter: blurTo(b * 1.2), opacity: 0, scale: 1.4, [axis]: sign * d * 0.35 },
        rest: { filter: blurTo(0), opacity: 1, scale: 1, [axis]: 0 },
        fade: EASE_OUT,
        bounce: 0.25,
        settle: 0.5,
      };
    case 'tilt': {
      const rotate = axis === 'y' ? 'rotateX' : 'rotateY';
      const lean = axis === 'y' ? -sign : sign;
      return {
        from: {
          filter: blurTo(b),
          opacity: 0,
          [rotate]: lean * 55,
          [axis]: sign * d * 0.5,
          transformPerspective: 600,
        },
        rest: { filter: blurTo(0), opacity: 1, [rotate]: 0, [axis]: 0, transformPerspective: 600 },
        fade: EASE_OUT,
        bounce: 0.3,
        settle: 0.8,
        origin: {
          originX: axis === 'x' ? (sign < 0 ? 0 : 1) : 0.5,
          originY: axis === 'y' ? (sign < 0 ? 0 : 1) : 0.5,
        },
      };
    }
    case 'focus':
      return {
        from: { filter: blurTo(b * 1.4), opacity: 0.32, scale: 1.12 },
        rest: { filter: blurTo(0), opacity: 1, scale: 1 },
        fade: EASE_IN_OUT,
        bounce: null,
        settle: 1,
      };
    case 'drift': {
      const h = direction === 'right' ? 1 : -1;
      const v = axis === 'y' ? sign : 0;
      return {
        from: { filter: blurTo(b), opacity: 0, x: h * d * 1.6, y: v * d * 0.3, skewX: h * 28 },
        rest: { filter: blurTo(0), opacity: 1, x: 0, y: 0, skewX: 0 },
        fade: EASE_OUT,
        bounce: 0.3,
        settle: 0.55,
      };
    }
    case 'blur':
      return {
        from: { filter: blurTo(b), opacity: 0, [axis]: sign * d },
        rest: { filter: blurTo(0), opacity: 1, [axis]: 0 },
        fade: 'linear',
        bounce: 0.35,
        settle: 0.5,
      };
  }
}

function buildKeyframes(from: Snapshot, rest: Snapshot): Keyframes {
  const keyframes: Keyframes = {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(rest)])) {
    keyframes[key] = [from[key] ?? 0, rest[key] ?? 0];
  }
  return keyframes;
}

/** Order in which pieces start; `random` is seeded by the text so it is stable between renders. */
function buildRanks(count: number, staggerFrom: BlurTextStaggerFrom, seedText: string): number[] {
  const ranks = Array.from({ length: count }, (_, i) => i);
  if (staggerFrom === 'end') return ranks.map((i) => count - 1 - i);
  if (staggerFrom === 'center') {
    const mid = (count - 1) / 2;
    const offset = count % 2 === 0 ? 0.5 : 0;
    return ranks.map((i) => Math.abs(i - mid) - offset);
  }
  if (staggerFrom === 'random') {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i++)
      seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619) >>> 0;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const order = ranks.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const swap = order[i] ?? i;
      order[i] = order[j] ?? j;
      order[j] = swap;
    }
    order.forEach((piece, rank) => {
      ranks[piece] = rank;
    });
  }
  return ranks;
}

/**
 * Words (or Chinese word segments) with trailing spaces and punctuation attached,
 * so a line never starts with a comma and Chinese text can wrap between words.
 */
function splitWords(text: string): string[] {
  const segmenter = new Intl.Segmenter(document.documentElement.lang || undefined, {
    granularity: 'word',
  });
  const words: string[] = [];
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    const previous = words.at(-1);
    if (previous !== undefined && /^\s+$/.test(segment)) {
      words[words.length - 1] = previous + NBSP;
    } else if (previous !== undefined && isWordLike !== true) {
      words[words.length - 1] = previous + segment;
    } else if (!/^\s+$/.test(segment)) {
      words.push(segment);
    }
  }
  return words;
}

/** A line of text that resolves from blurred to sharp, word by word or letter by letter. */
export function BlurText({
  text,
  as: Tag = 'p',
  delay = 120,
  className,
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  onAnimationComplete,
  stepDuration = 0.35,
  blur = 10,
  distance = 24,
  effect = 'blur',
  staggerFrom = 'start',
  trigger = 'load',
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() === true;
  const [playing, setPlaying] = useState(trigger === 'load');
  const complete = useEffectEvent(() => onAnimationComplete?.());

  const fx = useMemo(
    () => buildEffect(effect, direction, blur, distance),
    [effect, direction, blur, distance],
  );
  const keyframes = useMemo(() => buildKeyframes(fx.from, fx.rest), [fx]);

  const words = useMemo(() => splitWords(text), [text]);
  const pieces = useMemo<Piece[]>(
    () =>
      words.flatMap((word, w) =>
        animateBy === 'words'
          ? [{ word: w, content: word, key: `word-${String(w)}` }]
          : Array.from(word, (char, c) => ({
              word: w,
              content: char,
              key: `char-${String(w)}-${String(c)}`,
            })),
      ),
    [words, animateBy],
  );
  const groups = useMemo(() => {
    const list: number[][] = words.map(() => []);
    pieces.forEach((piece, index) => list[piece.word]?.push(index));
    return list;
  }, [words, pieces]);

  const ranks = useMemo(
    () => buildRanks(pieces.length, staggerFrom, text),
    [pieces.length, staggerFrom, text],
  );
  const stagger = Math.max(0, delay) / 1000;
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 0);
  const total = (stepDuration * Math.max(1, fx.settle * 2.2) + maxRank * stagger) * 1000;

  useEffect(() => {
    if (playing || reduce) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting === true) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [playing, reduce, threshold, rootMargin]);

  useEffect(() => {
    if (!playing || reduce) return undefined;
    const timer = window.setTimeout(complete, total);
    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, reduce, total]);

  if (reduce) {
    return <Tag className={className}>{text}</Tag>;
  }

  const transitionFor = (rank: number): Transition => {
    const delayed = rank * stagger;
    const transition: Record<string, unknown> = {
      duration: stepDuration,
      delay: delayed,
      ease: fx.fade,
    };
    if (fx.bounce !== null) {
      const move = {
        type: 'spring',
        visualDuration: stepDuration * fx.settle,
        bounce: fx.bounce,
        delay: delayed,
      };
      for (const key of MOVE_KEYS) {
        if (key in fx.from) transition[key] = move;
      }
    }
    return transition as Transition;
  };

  const pieceStyle: MotionStyle | undefined = fx.origin;

  return (
    <Tag ref={ref as never} className={cn('flex flex-wrap', className)}>
      <span className="sr-only">{text}</span>
      {groups.map((indices, w) => (
        <span key={`word-${String(w)}`} className="inline-flex" aria-hidden="true">
          {indices.map((index) => {
            const piece = pieces[index];
            if (!piece) return null;
            return (
              <motion.span
                key={piece.key}
                className="inline-block will-change-[transform,filter,opacity]"
                style={pieceStyle}
                initial={fx.from}
                animate={playing ? keyframes : fx.from}
                transition={transitionFor(ranks[index] ?? 0)}
              >
                {piece.content}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
