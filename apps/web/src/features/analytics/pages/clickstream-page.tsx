import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { NavKey } from '@/app/navigation';
import { QueryView } from '@/components/common/query-view';
import { SectionCard } from '@/components/common/section-card';
import { FadeContent } from '@/components/reactbits/fade-content';
import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

import { useClickstream } from '../api/analytics-queries';
import { AnalyticsShell } from '../components/analytics-shell';
import { BarTable } from '../components/bar-table';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { CountValue, MetricTile } from '../components/metric-tile';
import { useWindowParam } from '../hooks/use-window-param';

/** The page each route pattern is, where the app has a name for it. */
const ROUTE_PAGES: Readonly<Record<string, NavKey>> = {
  '/overview': 'overview',
  '/employees': 'employees',
  '/connectors': 'connectors',
  '/connectors/:connectorId': 'connectorDetail',
  '/connectors/new-mapping': 'newMapping',
  '/integration-map': 'integrationMap',
  '/workflows': 'workflows',
  '/workflows/tasks': 'tasks',
  '/workflows/:instanceId': 'workflowInstance',
  '/attendance-leave': 'attendanceLeave',
  '/attendance-leave/mappings': 'leaveMappings',
  '/attendance-leave/template': 'reportTemplate',
  '/reports': 'reports',
  '/governance': 'governance',
  '/governance/classification': 'classification',
  '/governance/transfers': 'transfers',
  '/governance/retention': 'retention',
  '/governance/audit': 'audit',
  '/analytics': 'analytics',
  '/analytics/clickstream': 'clickstream',
  '/analytics/ai-usage': 'aiUsage',
  '/settings': 'settings',
};

/** Consented, anonymous use: sessions, the demo journey's funnel, pages and languages (story G-2). */
export function ClickstreamPage() {
  const { t } = useTranslation('analytics');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const [days] = useWindowParam();
  const query = useClickstream(days);

  const pageName = (route: string) => {
    if (route === '/login') return t('clickstream.steps.sign-in');
    const key = ROUTE_PAGES[route];
    return key ? tCommon(`nav.${key}`) : null;
  };

  return (
    <AnalyticsShell
      title={t('clickstream.title')}
      description={t('clickstream.description')}
      sample={query.data?.meta?.mock === true}
    >
      <QueryView query={query} skeleton={<DashboardSkeleton />}>
        {({ data }) => {
          const first = data.funnel[0]?.sessions ?? 0;
          return (
            <FadeContent
              trigger="mount"
              className={cn(
                'space-y-6 transition-opacity',
                query.isPlaceholderData && 'opacity-60',
              )}
            >
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t('clickstream.consentNote')}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label={t('clickstream.sessions')}>
                  <CountValue value={data.sessions} />
                </MetricTile>
                <MetricTile label={t('clickstream.pageViews')}>
                  <CountValue value={data.pageViews} />
                </MetricTile>
                <MetricTile label={t('clickstream.perSession')}>
                  {format.number(data.sessions === 0 ? 0 : data.pageViews / data.sessions, {
                    maximumFractionDigits: 1,
                  })}
                </MetricTile>
              </div>
              {data.sessions === 0 ? (
                <p className="text-sm text-muted-foreground">{t('clickstream.empty')}</p>
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <SectionCard
                    title={t('clickstream.funnel')}
                    description={t('clickstream.funnelDescription')}
                  >
                    <BarTable
                      caption={t('clickstream.funnelCaption')}
                      labelHeader={t('clickstream.step')}
                      valueHeader={t('clickstream.sessions')}
                      extraHeaders={[t('clickstream.shareOfFirst')]}
                      rows={data.funnel.map((row) => ({
                        key: row.step,
                        label: t(`clickstream.steps.${row.step}`),
                        value: row.sessions,
                        display: format.integer(row.sessions),
                        extra: [format.percent(first === 0 ? 0 : row.sessions / first, 0)],
                      }))}
                    />
                  </SectionCard>
                  <SectionCard title={t('clickstream.languages')}>
                    <BarTable
                      caption={t('clickstream.languagesCaption')}
                      labelHeader={t('clickstream.language')}
                      valueHeader={t('clickstream.sessions')}
                      extraHeaders={[t('clickstream.share')]}
                      rows={data.locales.map((row) => ({
                        key: row.locale,
                        label: t(`clickstream.locale.${row.locale}`),
                        value: row.sessions,
                        display: format.integer(row.sessions),
                        extra: [format.percent(row.sessions / data.sessions, 0)],
                      }))}
                    />
                  </SectionCard>
                  <SectionCard title={t('clickstream.pages')} className="xl:col-span-2">
                    <BarTable
                      caption={t('clickstream.pagesCaption')}
                      labelHeader={t('clickstream.route')}
                      valueHeader={t('clickstream.views')}
                      extraHeaders={[t('clickstream.sessions')]}
                      rows={data.pages.map((row) => ({
                        key: row.route,
                        label: (
                          <span className="flex flex-col">
                            <span>{pageName(row.route) ?? row.route}</span>
                            <code className="font-mono text-xs text-muted-foreground">
                              {row.route}
                            </code>
                          </span>
                        ),
                        value: row.views,
                        display: format.integer(row.views),
                        extra: [format.integer(row.sessions)],
                      }))}
                    />
                  </SectionCard>
                </div>
              )}
            </FadeContent>
          );
        }}
      </QueryView>
    </AnalyticsShell>
  );
}
