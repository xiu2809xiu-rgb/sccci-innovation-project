/*
 * React Bits FuzzyText (free registry item @react-bits/FuzzyText-TS-TW from reactbits.dev, MIT + Commons Clause).
 * Adapted for HuiTong: trimmed to the slice-fuzz effect used by the 404 illustration, decorative (aria-hidden)
 * unless labelled, redrawn on theme change, paused off-screen, and a single crisp frame under reduced motion.
 */
'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { readTokenColor } from '@/lib/css-color';
import { cn } from '@/lib/utils';

export interface FuzzyTextProps {
  /** The text drawn on the canvas, e.g. "404". */
  children: string;
  /** Any CSS length; the canvas is an illustration, so it may exceed the type scale. */
  fontSize?: number | string;
  fontWeight?: number;
  fontFamily?: string;
  /** Any CSS colour; defaults to the surrounding text colour. */
  color?: string;
  baseIntensity?: number;
  hoverIntensity?: number;
  /** Maximum slice offset in CSS pixels at full intensity. */
  fuzzRange?: number;
  fps?: number;
  direction?: 'horizontal' | 'vertical';
  /** Give a label only when the text carries meaning; otherwise it is hidden from assistive tech. */
  ariaLabel?: string;
  className?: string;
}

const INSET = 5;

/** Text drawn on a canvas in jittering slices, fuzzing harder under the pointer. */
export function FuzzyText({
  children: text,
  fontSize = 'var(--text-xl)',
  fontWeight = 800,
  fontFamily = 'inherit',
  color = 'currentColor',
  baseIntensity = 0.18,
  hoverIntensity = 0.5,
  fuzzRange = 30,
  fps = 60,
  direction = 'horizontal',
  ariaLabel,
  className,
}: FuzzyTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() === true;
  const theme = useResolvedTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const source = document.createElement('canvas');
    const sourceContext = source.getContext('2d');
    if (!canvas || !context || !sourceContext) return undefined;

    const padX = direction === 'horizontal' ? fuzzRange + 20 : 0;
    const padY = direction === 'vertical' ? fuzzRange + 10 : 0;
    let cancelled = false;
    let visible = true;
    let hovering = false;
    let frame = 0;
    let lastFrame = 0;
    let dpr = 1;
    let offsets = new Int32Array(1);

    const fontPx = () => {
      if (typeof fontSize === 'number') return fontSize;
      const probe = document.createElement('span');
      probe.style.fontSize = fontSize;
      (canvas.parentElement ?? document.body).appendChild(probe);
      const size = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      return Number.isFinite(size) && size > 0 ? size : 16;
    };
    const family = () =>
      fontFamily === 'inherit' ? getComputedStyle(canvas).fontFamily || 'sans-serif' : fontFamily;
    // A canvas cannot resolve var(): token references are read from the stylesheet first.
    const ink = () => {
      if (/^(currentcolor|inherit)$/i.test(color)) {
        return getComputedStyle(canvas).color || readTokenColor('--foreground');
      }
      const token = /^var\((--[\w-]+)\)$/.exec(color)?.[1];
      return token ? readTokenColor(token as `--${string}`) : color;
    };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = fontPx();
      const font = `${String(fontWeight)} ${String(size)}px ${family()}`;
      sourceContext.font = font;
      const metrics = sourceContext.measureText(text);
      const width = Math.max(
        1,
        Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight),
      );
      const ascent = metrics.actualBoundingBoxAscent;
      const height = Math.max(1, Math.ceil(ascent + metrics.actualBoundingBoxDescent));
      source.width = Math.ceil((width + INSET * 2) * dpr);
      source.height = Math.ceil(height * dpr);
      sourceContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      sourceContext.font = font;
      sourceContext.textBaseline = 'alphabetic';
      sourceContext.fillStyle = ink();
      sourceContext.fillText(text, INSET + metrics.actualBoundingBoxLeft, ascent);
      const cssWidth = width + INSET * 2 + padX * 2;
      const cssHeight = height + padY * 2;
      canvas.width = Math.ceil(cssWidth * dpr);
      canvas.height = Math.ceil(cssHeight * dpr);
      canvas.style.width = `${String(cssWidth)}px`;
      canvas.style.height = `${String(cssHeight)}px`;
      offsets = new Int32Array(Math.max(source.width, source.height) + 1);
    };

    const draw = (intensity: number) => {
      const amplitude = intensity * fuzzRange * dpr;
      const ox = Math.round(padX * dpr);
      const oy = Math.round(padY * dpr);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (amplitude < 0.5) {
        context.drawImage(source, ox, oy);
        return;
      }
      const vertical = direction === 'vertical';
      const span = vertical ? source.width : source.height;
      for (let i = 0; i < span; i++) offsets[i] = Math.round((Math.random() - 0.5) * amplitude);
      for (let i = 0; i < span; i++) {
        const shift = offsets[i] ?? 0;
        if (vertical)
          context.drawImage(source, i, 0, 1, source.height, ox + i, oy + shift, 1, source.height);
        else context.drawImage(source, 0, i, source.width, 1, ox + shift, oy + i, source.width, 1);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (cancelled || !visible || document.visibilityState === 'hidden') return;
      frame = requestAnimationFrame(tick);
      if (now - lastFrame < 1000 / Math.max(1, fps) - 1) return;
      lastFrame = now;
      draw(hovering ? hoverIntensity : baseIntensity);
    };

    const resume = () => {
      if (!reduce && visible && !frame && !cancelled) frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      resume();
    });
    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };
    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', resume);

    const start = async () => {
      try {
        await document.fonts.load(`${String(fontWeight)} ${String(fontPx())}px ${family()}`);
      } catch {
        // Draw with whatever font is available.
      }
      if (cancelled) return;
      build();
      draw(reduce ? 0 : baseIntensity);
      observer.observe(canvas);
      resume();
    };
    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [
    text,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    baseIntensity,
    hoverIntensity,
    fuzzRange,
    fps,
    direction,
    reduce,
    theme,
  ]);

  const canvas = (
    <canvas ref={canvasRef} className={cn('max-w-full', className)} aria-hidden="true" />
  );
  return ariaLabel ? (
    <span role="img" aria-label={ariaLabel} className="inline-block max-w-full">
      {canvas}
    </span>
  ) : (
    canvas
  );
}
