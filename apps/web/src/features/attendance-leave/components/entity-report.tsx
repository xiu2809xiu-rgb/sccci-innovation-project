import type { EntityMonth } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { CountUp } from '@/components/reactbits/count-up';

import { useConnectorName } from '../hooks/use-connector-name';
import { LeaveBars } from './leave-bars';

function StatTile({
  label,
  value,
  decimals,
  suffix,
  sources,
}: {
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  sources: string;
}) {
  const { i18n } = useTranslation();
  return (
    <div className="space-y-1 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-foreground">
        <CountUp
          to={value}
          decimals={decimals}
          suffix={suffix}
          separator=","
          locale={i18n.language}
          trigger="load"
        />
      </p>
      <p className="text-xs text-muted-foreground">{sources}</p>
    </div>
  );
}

/** One entity's month: headcount, attendance and overtime as stat tiles, then leave by category. */
export function EntityReport({
  month,
  maxLeaveDays,
}: {
  month: EntityMonth;
  maxLeaveDays: number;
}) {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation();
  const connectorName = useConnectorName();
  const entity = tCommon(`entities.${month.entityCode}`);
  const from = (sources: string[]) =>
    t('sources', { sources: sources.map(connectorName).join(', ') });

  return (
    <SectionCard title={entity} description={t('workingDays', { count: month.workingDays })}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label={t('headcount')}
            value={month.headcount.value}
            decimals={0}
            sources={from(month.headcount.sources)}
          />
          <StatTile
            label={t('attendanceRate')}
            value={month.attendanceRate.value}
            decimals={1}
            suffix="%"
            sources={from(month.attendanceRate.sources)}
          />
          <StatTile
            label={t('overtime')}
            value={month.overtimeHours.value}
            decimals={1}
            sources={from(month.overtimeHours.sources)}
          />
        </div>
        <section aria-label={t('leave')} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('leave')}</h3>
          <LeaveBars month={month} max={maxLeaveDays} caption={t('leaveTable', { entity })} />
        </section>
      </div>
    </SectionCard>
  );
}
