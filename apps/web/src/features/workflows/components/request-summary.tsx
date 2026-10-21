import type { WorkflowInstanceDetail } from '@huitong/shared';
import { FileUser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

/** The request behind the workflow, and the employee record it has created, if any. */
export function RequestSummary({ instance }: { instance: WorkflowInstanceDetail }) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  // The master's own status labels, so a draft reads the same here as on the Employees page.
  const { t: tEmployees } = useTranslation('employees');
  const format = useFormatters();
  const rows: [string, string][] = [
    [t('instance.requestedBy'), instance.requestedBy.name],
    [t('instance.request'), instance.source.requestId],
    [t('instance.entity'), tCommon(`entities.${instance.entityCode}`)],
    [t('instance.positions'), format.integer(instance.headcount)],
    [
      t('instance.dayOne'),
      instance.expectedStartDate ? format.date(instance.expectedStartDate) : '—',
    ],
    [t('instance.started'), format.dateTime(instance.startedAt)],
  ];

  return (
    <div className="space-y-6">
      <SectionCard title={t('instance.summary')}>
        <dl className="grid gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right text-foreground tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
      <SectionCard title={t('instance.record')}>
        {instance.draftRecord ? (
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              <FileUser aria-hidden="true" className="size-4 text-muted-foreground" />
              {t('instance.recordDraft', { employeeNo: instance.draftRecord.employeeNo })}
              <StatusBadge tone="info">
                {tEmployees(`employmentStatus.${instance.draftRecord.status}`)}
              </StatusBadge>
            </p>
            <p className="text-sm text-muted-foreground">{t('instance.recordDraftHint')}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('instance.recordNone')}</p>
        )}
      </SectionCard>
    </div>
  );
}
