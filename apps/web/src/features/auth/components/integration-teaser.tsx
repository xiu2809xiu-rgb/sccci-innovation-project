import { useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { useAutoplayWindow } from '@/hooks/use-autoplay-window';
import { useTokenColor } from '@/hooks/use-token-color';
import { cssColorToHex } from '@/lib/css-color';
import { cn } from '@/lib/utils';
import { supportsWebGl } from '@/lib/webgl';

import type { IntegrationTeaserSceneProps, TeaserColors } from './integration-teaser-scene';

// three.js and React Three Fiber load only when the teaser is shown (their own chunk). The teaser
// sits beside the sign-in form, so a chunk that fails to load (a flaky network, or a redeploy that
// removed old files) falls back to the static drawing instead of taking the page down.
const IntegrationTeaserScene = lazy<ComponentType<IntegrationTeaserSceneProps>>(() =>
  import('./integration-teaser-scene')
    .then((module) => ({ default: module.IntegrationTeaserScene }))
    .catch(() => ({ default: TeaserFallback })),
);

/**
 * A static hub-and-spoke drawing: shown while the 3D scene loads, and in its place when there is
 * no WebGL or the scene fails.
 */
function TeaserFallback() {
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 200 200" className="size-full" role="presentation">
      {spokes.map((angle, index) => {
        const x = 100 + Math.cos((angle * Math.PI) / 180) * 72;
        const y = 100 + Math.sin((angle * Math.PI) / 180) * 30;
        return (
          <g key={angle} className={index === 3 ? 'opacity-40' : undefined}>
            <line
              x1={100}
              y1={100}
              x2={x}
              y2={y}
              className="stroke-border-strong"
              strokeWidth={1}
            />
            <circle cx={x} cy={y} r={7} className="fill-chart-2" />
          </g>
        );
      })}
      <circle cx={100} cy={100} r={13} className="fill-primary" />
    </svg>
  );
}

/**
 * A 3D preview of the integration map: HuiTong at the hub, the connected systems around it.
 * Decorative for sighted users; screen readers get the same picture as one sentence. It plays
 * for at most five seconds each time it comes into view, then holds its last frame (WCAG 2.2.2).
 */
export function IntegrationTeaser({ className }: { className?: string }) {
  const { t } = useTranslation('auth');
  const reduce = useReducedMotion() === true;
  const [webGl] = useState(supportsWebGl);
  const [inView, setInView] = useState(false);
  const playing = useAutoplayWindow(inView);
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
      setInView(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={stage} className={cn('relative', className)}>
      <div className="size-full" aria-hidden="true">
        {webGl ? (
          // A WebGL context can still fail to start (blocked GPU, lost context); keep the drawing.
          <ErrorBoundary fallback={<TeaserFallback />}>
            <Suspense fallback={<TeaserFallback />}>
              <IntegrationTeaserScene colors={colors} animate={!reduce} active={playing} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <TeaserFallback />
        )}
      </div>
      <p className="sr-only">{t('landing.teaser.fallback')}</p>
    </div>
  );
}
