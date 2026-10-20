/*
 * React Bits FadeContent (free registry item @react-bits/FadeContent-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: token motion timing (250 ms, quint ease-out), content hidden with opacity rather than
 * visibility so it stays readable and focusable (focus reveals it at once), and a static visible state under
 * reduced motion.
 */
'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from 'motion/react';
import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

gsap.registerPlugin(ScrollTrigger);

export type FadeContentEffect = 'fade' | 'focus' | 'develop' | 'dissolve' | 'mist' | 'pixel';
export type FadeContentStaggerFrom = 'start' | 'end' | 'center' | 'edges' | 'random';

/** Props for {@link FadeContent}. Durations, delays and stagger above 10 are read as milliseconds. */
export interface FadeContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Scroll container (element or selector); defaults to the window. */
  container?: Element | string | null;
  effect?: FadeContentEffect;
  /** Extra starting blur: `true` for 10 px, or a number of pixels. */
  blur?: boolean | number;
  /** Seconds; defaults to the slow motion token (250 ms). */
  duration?: number;
  /** GSAP ease; defaults to quint ease-out, the curve behind the `--ease-out` token. */
  ease?: string;
  delay?: number;
  /** Fraction of the viewport the element must enter before it reveals. */
  threshold?: number;
  initialOpacity?: number;
  /** Seconds between children; above 0, each direct child reveals in turn. */
  stagger?: number;
  staggerFrom?: FadeContentStaggerFrom;
  trigger?: 'scroll' | 'mount';
  once?: boolean;
  /** Hide again once scrolled past the far edge. */
  exit?: boolean;
  /** Tie progress to the scroll position; a number smooths it over that many seconds. */
  scrub?: boolean | number;
  /** Seconds after revealing to hide the content again; 0 keeps it. */
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void;
}

type NoiseEffect = 'dissolve' | 'mist' | 'pixel';

interface Look {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  share: number;
}

interface NoiseMask {
  state: { progress: number };
  render: () => void;
  remove: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const LEVELS = Array.from({ length: 33 }, (_, i) => 1 / (1 + Math.exp(-10.8 * (i / 32 - 0.5))));

let maskCount = 0;

const isNoiseEffect = (effect: FadeContentEffect): effect is NoiseEffect =>
  effect === 'dissolve' || effect === 'mist' || effect === 'pixel';

const toSeconds = (value: number) => (value > 10 ? value / 1000 : value);

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

function noiseFor(kind: NoiseEffect, size: number) {
  switch (kind) {
    case 'mist':
      return {
        frequency: Math.min(Math.max(4 / size, 0.004), 0.02),
        octaves: 3,
        edge: 0.35,
        blur: 10,
        block: 0,
      };
    case 'pixel': {
      const block = 2 * Math.round(Math.min(Math.max(size / 32, 6), 24) / 2);
      return { frequency: 0.5 / block, octaves: 1, edge: 0.06, blur: 0, block };
    }
    case 'dissolve':
      return { frequency: 0.6, octaves: 1, edge: 0.15, blur: 0, block: 0 };
  }
}

/**
 * Builds an SVG noise filter that eats into `target` and returns a progress proxy for GSAP.
 * At progress 0 the content is fully transparent but still in the accessibility tree.
 */
function createNoiseMask(
  target: HTMLElement,
  kind: NoiseEffect,
  floor: number,
  extraBlur: number,
): NoiseMask {
  const box = target.getBoundingClientRect();
  const { frequency, octaves, edge, blur, block } = noiseFor(
    kind,
    Math.sqrt(Math.max(box.width * box.height, 1)),
  );
  const node = (name: string, attrs: Record<string, string | number>, parent: Element) => {
    const child = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, String(value));
    parent.appendChild(child);
    return child;
  };
  const svg = node('svg', { width: 0, height: 0, 'aria-hidden': 'true' }, document.body);
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  maskCount += 1;
  const id = `fade-content-mask-${maskCount}`;
  const filter = node(
    'filter',
    {
      id,
      x: '-10%',
      y: '-10%',
      width: '120%',
      height: '120%',
      'color-interpolation-filters': 'sRGB',
    },
    svg,
  );
  node(
    'feTurbulence',
    {
      type: 'fractalNoise',
      baseFrequency: frequency,
      numOctaves: octaves,
      seed: Math.floor(Math.random() * 1000),
      result: 'noise',
    },
    filter,
  );
  let source = 'noise';
  if (block > 0) {
    const dot = block / 2 - 1;
    node(
      'feColorMatrix',
      {
        in: 'noise',
        type: 'matrix',
        values: '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1',
        result: 'gray',
      },
      filter,
    );
    // Only the flood's alpha matters (it samples the noise grid), so the default flood colour is kept.
    node('feFlood', { x: dot, y: dot, width: 2, height: 2, result: 'dot' }, filter);
    node(
      'feComposite',
      { in: 'dot', in2: 'dot', width: block, height: block, result: 'cell' },
      filter,
    );
    node('feTile', { in: 'cell', result: 'grid' }, filter);
    node('feComposite', { in: 'gray', in2: 'grid', operator: 'in', result: 'samples' }, filter);
    node(
      'feMorphology',
      { in: 'samples', operator: 'dilate', radius: dot, result: 'blocks' },
      filter,
    );
    source = 'blocks';
  }
  node(
    'feColorMatrix',
    { in: source, type: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.43 0 0 0 -0.21' },
    filter,
  );
  const curve = node(
    'feFuncA',
    { type: 'table' },
    node('feComponentTransfer', { result: 'mask' }, filter),
  );
  node('feComposite', { in: 'SourceGraphic', in2: 'mask', operator: 'in' }, filter);

  const url = `url(#${id})`;
  const blurFrom = blur + extraBlur;
  const state = { progress: 0 };
  let drawn = -1;

  const render = () => {
    const progress = state.progress;
    if (progress === drawn) return;
    drawn = progress;
    if (progress >= 1) {
      target.style.filter = '';
      return;
    }
    const front = progress * (1 + 2 * edge) - edge;
    curve.setAttribute(
      'tableValues',
      LEVELS.map((level) =>
        (floor + (1 - floor) * (1 - smoothstep(front - edge, front + edge, level))).toFixed(3),
      ).join(' '),
    );
    target.style.filter =
      blurFrom > 0 ? `${url} blur(${(blurFrom * (1 - progress)).toFixed(2)}px)` : url;
  };

  render();

  return {
    state,
    render,
    remove: () => {
      svg.remove();
      target.style.filter = '';
    },
  };
}

function getLooks(
  effect: Exclude<FadeContentEffect, NoiseEffect>,
  blur: number,
  initialOpacity: number,
): Look[] {
  const soften = (amount: number) => `blur(${amount}px)`;
  if (effect === 'focus') {
    return [
      { from: { opacity: initialOpacity }, to: { opacity: 1 }, share: 0.6 },
      {
        from: { filter: soften(12 + blur), scale: 0.97 },
        to: { filter: soften(0), scale: 1 },
        share: 1,
      },
    ];
  }
  if (effect === 'develop') {
    return [
      { from: { opacity: initialOpacity }, to: { opacity: 1 }, share: 0.5 },
      {
        from: { filter: `grayscale(1) contrast(0.55) brightness(1.3) ${soften(blur)}` },
        to: { filter: `grayscale(0) contrast(1) brightness(1) ${soften(0)}` },
        share: 1,
      },
    ];
  }
  if (blur > 0) {
    return [
      {
        from: { opacity: initialOpacity, filter: soften(blur) },
        to: { opacity: 1, filter: soften(0) },
        share: 1,
      },
    ];
  }
  return [{ from: { opacity: initialOpacity }, to: { opacity: 1 }, share: 1 }];
}

/**
 * Reveals its children with a fade (or a focus, develop, dissolve, mist or pixel effect) when
 * scrolled into view or on mount. Not-yet-revealed content is transparent but stays in the
 * accessibility tree, and moving keyboard focus into it completes the reveal immediately. With
 * reduced motion the content renders fully visible and `onComplete` fires once.
 */
export function FadeContent({
  children,
  container,
  effect = 'fade',
  blur = false,
  duration = 0.25,
  ease = 'power4.out',
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  stagger = 0,
  staggerFrom = 'start',
  trigger = 'scroll',
  once = true,
  exit = false,
  scrub = false,
  disappearAfter = 0,
  disappearDuration = 0.2,
  disappearEase = 'power2.in',
  onStart,
  onComplete,
  onDisappearanceComplete,
  ...props
}: FadeContentProps) {
  const reduceMotion = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const emitStart = useEffectEvent(() => {
    onStart?.();
  });
  const emitComplete = useEffectEvent(() => {
    onComplete?.();
  });
  const emitDisappeared = useEffectEvent(() => {
    onDisappearanceComplete?.();
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduceMotion) {
      emitComplete();
      return undefined;
    }

    const scroller =
      typeof container === 'string' ? document.querySelector(container) : (container ?? null);
    const targets =
      stagger > 0 && el.children.length > 0
        ? Array.from(el.children).filter((child) => child instanceof HTMLElement)
        : [el];
    const seconds = Math.max(toSeconds(duration), 0.01);
    const blurAmount = typeof blur === 'number' ? Math.max(blur, 0) : blur ? 10 : 0;
    const startOpacity = clamp01(initialOpacity);
    const staggerVars: gsap.TweenVars =
      stagger > 0 ? { stagger: { each: toSeconds(stagger), from: staggerFrom } } : {};
    const noiseKind = isNoiseEffect(effect) ? effect : null;
    const looks = isNoiseEffect(effect) ? [] : getLooks(effect, blurAmount, startOpacity);
    const scrubbing = (typeof scrub === 'number' ? scrub > 0 : scrub) && trigger !== 'mount';
    const replaying = !once || exit;
    const disappearing = disappearAfter > 0 && !replaying && !scrubbing;

    let masks: NoiseMask[] = [];
    let follow: gsap.core.Tween | null = null;
    let timeline: gsap.core.Timeline | null = null;

    const ctx = gsap.context(() => undefined, el);
    ctx.add(() => {
      if (noiseKind) {
        masks = targets.map((target) =>
          createNoiseMask(target, noiseKind, startOpacity, blurAmount),
        );
      }
      const proxies = masks.map((mask) => mask.state);
      const draw = () => {
        for (const mask of masks) mask.render();
      };

      const reveal = (tl: gsap.core.Timeline, position: number) => {
        if (noiseKind) {
          tl.fromTo(
            proxies,
            { progress: 0 },
            { progress: 1, duration: seconds, ease, ...staggerVars, onUpdate: draw },
            position,
          );
          return;
        }
        for (const look of looks) {
          tl.fromTo(
            targets,
            look.from,
            { ...look.to, duration: seconds * look.share, ease, ...staggerVars },
            position,
          );
        }
      };

      const conceal = (tl: gsap.core.Timeline, vars: gsap.TweenVars) => {
        if (noiseKind) {
          tl.to(proxies, { progress: 0, ...vars, onUpdate: draw }, 0);
          return;
        }
        for (const look of looks) tl.to(targets, { ...look.from, ...vars }, 0);
      };

      const settle = () => {
        if (noiseKind) {
          for (const mask of masks) mask.remove();
          masks = [];
          return;
        }
        gsap.set(targets, { clearProps: 'filter,transform' });
      };

      const disappear = () => {
        const out = gsap.timeline({
          delay: toSeconds(disappearAfter),
          onComplete: () => {
            // Content that has gone completely leaves the tab order and the accessibility tree.
            if (startOpacity === 0) gsap.set(targets, { visibility: 'hidden' });
            emitDisappeared();
          },
        });
        conceal(out, {
          duration: Math.max(toSeconds(disappearDuration), 0.01),
          ease: disappearEase,
          ...staggerVars,
        });
      };

      const tl = gsap.timeline({
        paused: true,
        onStart: () => {
          emitStart();
        },
        onComplete: () => {
          emitComplete();
          if (scrubbing) return;
          if (disappearing) {
            // Recorded in the context so unmounting mid-way kills and reverts it.
            ctx.add(disappear);
            return;
          }
          if (!replaying || !noiseKind) settle();
        },
      });
      timeline = tl;
      reveal(tl, scrubbing ? 0 : Math.max(toSeconds(delay), 0));

      if (trigger === 'mount') {
        tl.play();
        return;
      }

      const measure = () => {
        const view = scroller
          ? scroller.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
        const scrolled = scroller ? scroller.scrollTop : window.scrollY;
        const box = el.getBoundingClientRect();
        return {
          height: view.height,
          scrolled,
          limit: scroller
            ? scroller.scrollHeight - scroller.clientHeight
            : document.documentElement.scrollHeight - window.innerHeight,
          top: box.top - view.top + scrolled,
          bottom: box.bottom - view.top + scrolled,
        };
      };

      if (scrubbing) {
        const smoothing = typeof scrub === 'number' ? scrub : 0;
        const update = () => {
          const { height, scrolled, limit, top, bottom } = measure();
          const zone = height * Math.min(Math.max((1 - 2 * threshold) * 0.4, 0.05), 0.4);
          const revealed = Math.min(top - height * (1 - threshold) + zone, limit);
          let visible = clamp01((scrolled - revealed) / zone + 1);
          if (exit) {
            const outStart = Math.max(bottom - height * threshold - zone, 0);
            const outEnd = Math.max(bottom - height * threshold, outStart + zone / 2);
            visible = Math.min(visible, 1 - clamp01((scrolled - outStart) / (outEnd - outStart)));
          }
          visible = Math.round(visible * 1000) / 1000;
          if (smoothing > 0) {
            follow = gsap.to(tl, {
              progress: visible,
              duration: smoothing,
              ease: 'power3.out',
              overwrite: true,
            });
          } else {
            tl.progress(visible);
          }
        };
        ScrollTrigger.create({
          trigger: el,
          scroller,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: update,
          onRefresh: update,
        });
        update();
        return;
      }

      ScrollTrigger.create({
        trigger: el,
        scroller,
        start: () => {
          const { height, limit, top } = measure();
          const start = top - height * (1 - threshold);
          return start > limit ? limit - 1 : start;
        },
        end: exit ? `bottom ${threshold * 100}%` : undefined,
        once: !replaying,
        onEnter: () => {
          tl.play();
        },
        onLeave: exit
          ? () => {
              tl.reverse();
            }
          : undefined,
        onEnterBack: exit
          ? () => {
              tl.play();
            }
          : undefined,
        onLeaveBack: once
          ? undefined
          : () => {
              tl.reverse();
            },
      });
    });

    // Keyboard users must never land on transparent content: focus completes the reveal.
    const revealNow = () => {
      if (!timeline || scrubbing || timeline.progress() >= 1) return;
      timeline.reversed(false);
      timeline.progress(1);
    };
    el.addEventListener('focusin', revealNow);

    return () => {
      el.removeEventListener('focusin', revealNow);
      follow?.kill();
      ctx.revert();
      for (const mask of masks) mask.remove();
    };
  }, [
    container,
    effect,
    blur,
    duration,
    ease,
    delay,
    threshold,
    initialOpacity,
    stagger,
    staggerFrom,
    trigger,
    once,
    exit,
    scrub,
    disappearAfter,
    disappearDuration,
    disappearEase,
    reduceMotion,
  ]);

  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
