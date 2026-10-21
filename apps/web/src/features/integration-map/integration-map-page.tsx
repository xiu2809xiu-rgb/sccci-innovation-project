import { useReducedMotion } from 'motion/react';
import { Network, Pause, Play } from 'lucide-react';
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SectionCard } from '@/components/common/section-card';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supportsWebGl } from '@/lib/webgl';

import { MapFallback } from './components/map-fallback';
import { MapLegend } from './components/map-legend';
import { SceneLoading } from './components/scene-loading';
import type { ConstellationSceneProps } from './components/scene/constellation-scene';
import type { SceneText } from './components/scene/scene-types';
import { SystemList } from './components/system-list';
import { useInView } from './hooks/use-in-view';
import { useMapNodes } from './hooks/use-map-nodes';
import { useSceneColours } from './hooks/use-scene-colours';
import { CLUSTERS, NODE_STATES } from './map-model';

// three.js, React Three Fiber and the effects load only with this page (their own chunk). A chunk
// that fails to load throws to the same boundary as a WebGL context that fails to start.
const ConstellationScene = lazy<ComponentType<ConstellationSceneProps>>(() =>
  import('./components/scene/constellation-scene').then((module) => ({
    default: module.ConstellationScene,
  })),
);

/**
 * The integration map (area 1, story A-6): every connected system around the
 * HuiTong core, lit by its live state. The list beside it carries the same
 * information and navigation for keyboard and screen-reader users.
 */
export function IntegrationMapPage() {
  const { t, i18n } = useTranslation('integrationMap');
  const navigate = useNavigate();
  const { query, nodes } = useMapNodes();
  const colours = useSceneColours();
  const reduceMotion = useReducedMotion() === true;
  const [webGl] = useState(supportsWebGl);
  // A scene that could not start shows the still, which has nothing to pause.
  const [failed, setFailed] = useState(false);
  const scene = webGl && !failed;
  const [paused, setPaused] = useState(false);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const inView = useInView(stage);
  const running = inView && !paused && !reduceMotion;

  const text = useMemo<SceneText>(() => {
    const chinese = i18n.language === 'zh-CN';
    return {
      cluster: Object.fromEntries(
        CLUSTERS.map((cluster) => [cluster, t(`cluster.${cluster}`)]),
      ) as SceneText['cluster'],
      state: Object.fromEntries(
        NODE_STATES.map((state) => [state, t(`state.${state}`)]),
      ) as SceneText['state'],
      names: Object.fromEntries(
        nodes.map((node) => [node.id, chinese ? node.connector.nameZh : node.connector.name]),
      ),
      hidden: (count) => t('scene.hidden', { count }),
    };
  }, [t, i18n.language, nodes]);

  // WCAG 2.2.2: the scene moves on its own beside other content, so it can be paused.
  const motionControl =
    scene && !reduceMotion ? (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setPaused((current) => !current);
        }}
      >
        {paused ? (
          <Play aria-hidden="true" data-icon="inline-start" />
        ) : (
          <Pause aria-hidden="true" data-icon="inline-start" />
        )}
        {paused ? t('motion.play') : t('motion.pause')}
      </Button>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={<SyntheticDataBadge />}
        actions={motionControl}
      />
      <QueryView
        query={query}
        skeleton={<Skeleton className="aspect-video w-full" />}
        isEmpty={(connectors) => connectors.length === 0}
        empty={
          <EmptyState
            icon={Network}
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              <Button asChild variant="outline">
                <Link to="/connectors">{t('empty.action')}</Link>
              </Button>
            }
          />
        }
      >
        {() => (
          <FadeContent trigger="mount" className="grid items-start gap-6 xl:grid-cols-12">
            <section
              aria-label={t('scene.label')}
              className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card bg-[radial-gradient(ellipse_at_center,var(--card)_55%,var(--background))] xl:sticky xl:top-[calc(var(--header-height)+(--spacing(6)))] xl:col-span-8"
            >
              <p className="sr-only">{t('scene.summary', { count: nodes.length })}</p>
              <div ref={setStage} className="aspect-video w-full">
                {webGl ? (
                  <ErrorBoundary
                    fallback={<MapFallback />}
                    onError={() => {
                      setFailed(true);
                    }}
                  >
                    <div className="size-full" aria-hidden="true">
                      <Suspense fallback={<SceneLoading />}>
                        <ConstellationScene
                          nodes={nodes}
                          running={running}
                          colours={colours}
                          text={text}
                          onOpen={(connectorId) => {
                            void navigate(`/connectors/${encodeURIComponent(connectorId)}`);
                          }}
                        />
                      </Suspense>
                    </div>
                  </ErrorBoundary>
                ) : (
                  <MapFallback />
                )}
              </div>
              <div className="pointer-events-none absolute start-3 bottom-3">
                <MapLegend note={reduceMotion && scene ? t('motion.reduced') : undefined} />
              </div>
            </section>
            <SectionCard
              title={t('list.title')}
              description={t('list.description')}
              className="min-w-0 xl:col-span-4"
            >
              <SystemList nodes={nodes} />
            </SectionCard>
          </FadeContent>
        )}
      </QueryView>
    </div>
  );
}
