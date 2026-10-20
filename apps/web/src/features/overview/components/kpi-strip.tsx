import type { Overview } from '@huitong/shared';
import { ArrowRight, GitCompareArrows, PlugZap, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { CountUp } from '@/components/reactbits/count-up';
import { useFormatters } from '@/hooks/use-formatters';

import { KpiCard } from './kpi-card';

/** The four figures HR checks first (success metrics SM-02 and GR-08 in docs/design-thinking). */
export function KpiStrip({
  kpis,
  canReviewConflicts,
}: {
  kpis: Overview['kpis'];
  canReviewConflicts: boolean;
}) {
  const { t } = useTranslation('overview');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const { employees, consistencyRate, openConflicts, connectors } = kpis;

  return (
    <section aria-label={t('kpis.label')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={t('kpis.employees.label')}
        icon={Users}
        value={<CountUp to={employees.total} separator="," locale={format.locale} />}
        hint={
          employees.total === 0
            ? t('kpis.employees.empty')
            : employees.byEntity
                .map((row) =>
                  t('kpis.employees.breakdown', {
                    entity: tCommon(`entities.${row.entityCode}`),
                    count: format.integer(row.count),
                  }),
                )
                .join(' · ')
        }
      />
      <KpiCard
        label={t('kpis.consistency.label')}
        icon={ShieldCheck}
        value={
          consistencyRate === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <CountUp to={consistencyRate * 100} decimals={1} suffix="%" locale={format.locale} />
          )
        }
        hint={consistencyRate === null ? t('kpis.consistency.empty') : t('kpis.consistency.hint')}
      />
      <KpiCard
        label={t('kpis.openConflicts.label')}
        icon={GitCompareArrows}
        value={<CountUp to={openConflicts} separator="," locale={format.locale} />}
        hint={t('kpis.openConflicts.hint')}
        footer={
          canReviewConflicts && openConflicts > 0 ? (
            <Link
              to="/employees?view=conflicts"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('kpis.openConflicts.link')}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null
        }
      />
      <KpiCard
        label={t('kpis.connectors.label')}
        icon={PlugZap}
        value={t('kpis.connectors.value', {
          healthy: format.integer(connectors.healthy),
          total: format.integer(connectors.total),
        })}
        hint={t('kpis.connectors.hint')}
      />
    </section>
  );
}
