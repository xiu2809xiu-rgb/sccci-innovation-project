import type { ObservabilityDashboard } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { QueryView } from '@/components/common/query-view';
import { SectionCard } from '@/components/common/section-card';
import { FadeContent } from '@/components/reactbits/fade-content';
import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

import { useObservability } from '../api/analytics-queries';
import { AnalyticsShell } from '../components/analytics-shell';
import { DailyChart } from '../components/daily-chart';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { CountValue, MetricTile } from '../components/metric-tile';
import { ServiceHealth } from '../components/service-health';
import { useWindowParam } from '../hooks/use-window-param';

type Day = ObservabilityDashboard['requests'][number];

/** Service health, and the API's requests, errors and p95 latency by day (story G-1). */
export function ObservabilityPage() {
  const { t } = useTranslation('analytics');
  const format = useFormatters();
  const [days] = useWindowParam();
  const query = useObservability(days);

  return (
    <AnalyticsShell
      title={t('observability.title')}
      description={t('observability.description')}
      sample={query.data?.meta?.mock === true}
    >
      <QueryView query={query} skeleton={<DashboardSkeleton />}>
        {({ data }) => {
          const requests = data.requests.reduce((total, day) => total + day.requests, 0);
          const errors = data.requests.reduce((total, day) => total + day.errors, 0);
          return (
            <FadeContent
              trigger="mount"
              className={cn(
                'space-y-6 transition-opacity',
                query.isPlaceholderData && 'opacity-60',
              )}
            >
              <SectionCard
                title={t('observability.services')}
                description={t('observability.servicesDescription')}
              >
                <ServiceHealth services={data.services} />
              </SectionCard>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label={t('observability.requests')}>
                  <CountValue value={requests} />
                </MetricTile>
                <MetricTile label={t('observability.errors')}>
                  <CountValue value={errors} />
                </MetricTile>
                <MetricTile label={t('observability.errorRate')}>
                  {format.percent(requests === 0 ? 0 : errors / requests, 2)}
                </MetricTile>
              </div>
              {requests === 0 ? (
                <p className="text-sm text-muted-foreground">{t('observability.empty')}</p>
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <SectionCard title={t('observability.requestsPerDay')}>
                    <DailyChart<Day>
                      caption={t('observability.requestsCaption')}
                      points={data.requests}
                      label={t('observability.requests')}
                      value={(day) => day.requests}
                      format={(value) => format.integer(value)}
                      extra={[
                        {
                          label: t('observability.errors'),
                          value: (day) => format.integer(day.errors),
                        },
                      ]}
                    />
                  </SectionCard>
                  <SectionCard title={t('observability.p95PerDay')}>
                    <DailyChart<Day>
                      caption={t('observability.p95Caption')}
                      points={data.requests}
                      label={t('observability.p95')}
                      value={(day) => day.p95Ms}
                      format={(value) => format.elapsed(value)}
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
