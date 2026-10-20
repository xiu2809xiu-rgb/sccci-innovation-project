import { useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { useTokenColor } from '@/hooks/use-token-color';
import { cssColorToHex } from '@/lib/css-color';

import type { TeaserColors } from './integration-teaser-scene';

// three.js and React Three Fiber load only when the teaser is shown (their own chunk).
const IntegrationTeaserScene = lazy(() =>
  import('./integration-teaser-scene').then((module) => ({
    default: module.IntegrationTeaserScene,
  })),
);

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A static hub-and-spoke drawing for browsers without WebGL. */
function TeaserFallback() {
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 200 120" className="size-full" role="presentation">
      {spokes.map((angle, index) => {
        const x = 100 + Math.cos((angle * Math.PI) / 180) * 70;
        const y = 60 + Math.sin((angle * Math.PI) / 180) * 40;
        return (
          <g key={angle} className={index === 3 ? 'opacity-40' : undefined}>
            <line x1={100} y1={60} x2={x} y2={y} className="stroke-border-strong" strokeWidth={1} />
            <circle cx={x} cy={y} r={7} className="fill-chart-2" />
          </g>
        );
      })}
      <circle cx={100} cy={60} r={12} className="fill-primary" />
    </svg>
  );
}

/** The landing page's preview of the integration map, with a caption and a text equivalent. */
export function IntegrationTeaser() {
  const { t } = useTranslation('auth');
  const reduce = useReducedMotion() === true;
  const [webGl] = useState(supportsWebGl);
  const [active, setActive] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const primary = useTokenColor('--primary');
  const chart2 = useTokenColor('--chart-2');
  const chart3 = useTokenColor('--chart-3');
  const chart5 = useTokenColor('--chart-5');
  const border = useTokenColor('--border-strong');
  const muted = useTokenColor('--muted-foreground');

  const colors = useMemo<TeaserColors>(
    () => ({
      hub: cssColorToHex(primary),
      link: cssColorToHex(border),
      pulse: cssColorToHex(primary),
      nodes: [chart2, chart3, chart5].map(cssColorToHex),
      retired: cssColorToHex(muted),
    }),
    [primary, chart2, chart3, chart5, border, muted],
  );

  useEffect(() => {
    const element = stage.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setActive(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <div ref={stage} className="relative h-56 sm:h-64" aria-hidden="true">
        {webGl ? (
          <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
            <IntegrationTeaserScene colors={colors} animate={!reduce} active={active} />
          </Suspense>
        ) : (
          <TeaserFallback />
        )}
      </div>
      <figcaption className="space-y-1 border-t border-border p-4">
        <p className="text-sm font-semibold text-foreground">{t('landing.teaser.title')}</p>
        <p className="text-sm text-muted-foreground">{t('landing.teaser.caption')}</p>
        <p className="sr-only">{t('landing.teaser.fallback')}</p>
      </figcaption>
    </figure>
  );
}
