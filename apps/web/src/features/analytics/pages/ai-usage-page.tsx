import type { AiUsageDashboard } from '@huitong/shared';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { QueryView } from '@/components/common/query-view';
import { SectionCard } from '@/components/common/section-card';
import { FadeContent } from '@/components/reactbits/fade-content';
import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

import { useAiUsage } from '../api/analytics-queries';
import { AnalyticsShell } from '../components/analytics-shell';
import { BarTable } from '../components/bar-table';
import { DailyChart } from '../components/daily-chart';
import { DashboardSkeleton } from '../components/dashboard-skeleton';
import { CountValue, MetricTile } from '../components/metric-tile';
import { useWindowParam } from '../hooks/use-window-param';

type Day = AiUsageDashboard['byDay'][number];

/** Every AI call: tokens, estimated cost and outcome by feature, person, model and day (story G-3). */
export function AiUsagePage() {
  const { t } = useTranslation('analytics');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const [days] = useWindowParam();
  const query = useAiUsage(days);
  const usd = (value: number) => format.money(value, 'USD');

  return (
    <AnalyticsShell
      title={t('aiUsage.title')}
      description={t('aiUsage.description')}
      sample={query.data?.meta?.mock === true}
    >
      <QueryView query={query} skeleton={<DashboardSkeleton />}>
        {({ data }) => {
          const { totals } = data;
          const tokenHeaders = [t('aiUsage.calls'), t('aiUsage.cost')];
          return (
            <FadeContent
              trigger="mount"
              className={cn(
                'space-y-6 transition-opacity',
                query.isPlaceholderData && 'opacity-60',
              )}
            >
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t('aiUsage.costNote')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricTile label={t('aiUsage.calls')}>
                  <CountValue value={totals.calls} />
                </MetricTile>
                <MetricTile
                  label={t('aiUsage.tokens')}
                  hint={t('aiUsage.tokensSplit', {
                    input: format.compact(totals.inputTokens),
                    output: format.compact(totals.outputTokens),
                  })}
                >
                  <CountValue value={totals.inputTokens + totals.outputTokens} />
                </MetricTile>
                <MetricTile label={t('aiUsage.cost')}>{usd(totals.costUsd)}</MetricTile>
                <MetricTile label={t('aiUsage.errorRate')} hint={t('aiUsage.errorRateHint')}>
                  {format.percent(totals.errorRate)}
                </MetricTile>
                <MetricTile label={t('aiUsage.latency')}>
                  {format.elapsed(totals.medianLatencyMs)}
                </MetricTile>
              </div>
              {totals.calls === 0 ? (
                <p className="text-sm text-muted-foreground">{t('aiUsage.empty')}</p>
              ) : (
                <>
                  <SectionCard title={t('aiUsage.tokensPerDay')}>
                    <DailyChart<Day>
                      caption={t('aiUsage.tokensCaption')}
                      points={data.byDay}
                      label={t('aiUsage.tokens')}
                      value={(day) => day.inputTokens + day.outputTokens}
                      format={(value) => format.integer(value)}
                      extra={[
                        {
                          label: t('aiUsage.input'),
                          value: (day) => format.integer(day.inputTokens),
                        },
                        {
                          label: t('aiUsage.output'),
                          value: (day) => format.integer(day.outputTokens),
                        },
                        { label: t('aiUsage.cost'), value: (day) => usd(day.costUsd) },
                      ]}
                    />
                  </SectionCard>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <SectionCard title={t('aiUsage.byFeature')}>
                      <BarTable
                        caption={t('aiUsage.byFeatureCaption')}
                        labelHeader={t('aiUsage.feature')}
                        valueHeader={t('aiUsage.tokens')}
                        extraHeaders={tokenHeaders}
                        rows={data.byFeature.map((row) => ({
                          key: row.feature,
                          label: t(`aiUsage.features.${row.feature}`),
                          value: row.tokens,
                          display: format.compact(row.tokens),
                          extra: [format.integer(row.calls), usd(row.costUsd)],
                        }))}
                      />
                    </SectionCard>
                    <SectionCard title={t('aiUsage.outcomes')}>
                      <BarTable
                        caption={t('aiUsage.outcomesCaption')}
                        labelHeader={t('aiUsage.outcome')}
                        valueHeader={t('aiUsage.calls')}
                        rows={data.outcomes.map((row) => ({
                          key: row.outcome,
                          label: t(`aiUsage.outcomeLabel.${row.outcome}`),
                          value: row.calls,
                          display: format.integer(row.calls),
                        }))}
                      />
                    </SectionCard>
                    <SectionCard title={t('aiUsage.byUser')}>
                      <BarTable
                        caption={t('aiUsage.byUserCaption')}
                        labelHeader={t('aiUsage.person')}
                        valueHeader={t('aiUsage.tokens')}
                        extraHeaders={tokenHeaders}
                        rows={data.byUser.map((row, index) => ({
                          key: `${row.name ?? 'jobs'}-${String(index)}`,
                          label: (
                            <span className="flex flex-col">
                              <span>{row.name ?? t('aiUsage.backgroundJobs')}</span>
                              {row.role ? (
                                <span className="text-xs text-muted-foreground">
                                  {tCommon(`roles.${row.role}`)}
                                </span>
                              ) : null}
                            </span>
                          ),
                          value: row.tokens,
                          display: format.compact(row.tokens),
                          extra: [format.integer(row.calls), usd(row.costUsd)],
                        }))}
                      />
                    </SectionCard>
                    <SectionCard title={t('aiUsage.byModel')}>
                      <BarTable
                        caption={t('aiUsage.byModelCaption')}
                        labelHeader={t('aiUsage.model')}
                        valueHeader={t('aiUsage.tokens')}
                        extraHeaders={tokenHeaders}
                        rows={data.byModel.map((row) => ({
                          key: `${row.provider}-${row.model}`,
                          label: (
                            <span className="flex flex-col">
                              <code className="font-mono text-sm">{row.model}</code>
                              <span className="text-xs text-muted-foreground">
                                {t(`aiUsage.providers.${row.provider}`)}
                              </span>
                            </span>
                          ),
                          value: row.tokens,
                          display: format.compact(row.tokens),
                          extra: [format.integer(row.calls), usd(row.costUsd)],
                        }))}
                      />
                    </SectionCard>
                  </div>
                </>
              )}
            </FadeContent>
          );
        }}
      </QueryView>
    </AnalyticsShell>
  );
}
