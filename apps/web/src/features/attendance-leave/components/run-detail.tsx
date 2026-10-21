import type { ConsolidationRunDetail } from '@huitong/shared';
import { Download, EyeOff, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { UnavailableButton } from '@/components/common/unavailable-button';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/app/session/use-session';

import { useExportRun } from '../api/attendance-queries';
import { RUN_STATUS_TONE } from '../attendance-status';
import { useConnectorName } from '../hooks/use-connector-name';
import { usePeriods } from '../hooks/use-periods';
import { ExceptionItem } from './exception-item';

/** One run: what it read from each system, what it flagged, and the export once it is clean. */
export function RunDetail({ run, sample }: { run: ConsolidationRunDetail; sample: boolean }) {
  const { t } = useTranslation('attendanceLeave');
  const { t: tCommon } = useTranslation();
  const { label } = usePeriods();
  const connectorName = useConnectorName();
  const canExport = useHasPermission('reports:export');
  const exportRun = useExportRun();

  const exportAction = !canExport ? null : sample ? (
    <UnavailableButton
      label={t('run.export')}
      reason={t('run.exportSample')}
      icon={Download}
      size="sm"
    />
  ) : !run.exportable ? (
    <UnavailableButton
      label={t('run.export')}
      reason={t('run.exportNotReady')}
      icon={Download}
      size="sm"
    />
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={exportRun.isPending}
      onClick={() => {
        exportRun.mutate(run.id, {
          onError: (error) => {
            toast.error(tCommon(`errors.${error.code}`));
          },
        });
      }}
    >
      <Download aria-hidden="true" data-icon="inline-start" />
      {t('run.export')}
    </Button>
  );

  return (
    <SectionCard title={t('run.title', { period: label(run.period) })} action={exportAction}>
      <div className="space-y-5">
        <div className="space-y-2">
          <StatusBadge tone={RUN_STATUS_TONE[run.status]}>{t(`status.${run.status}`)}</StatusBadge>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t('runs.table.entities')}</dt>
            <dd className="text-foreground">{run.entityCodes.join(', ')}</dd>
            <dt className="text-muted-foreground">{t('runs.table.by')}</dt>
            <dd className="text-foreground">{run.triggeredBy ?? '—'}</dd>
          </dl>
        </div>
        {run.status === 'FAILED' ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            {t('run.failed')}
          </p>
        ) : null}
        <section aria-label={t('run.sources')} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('run.sources')}</h3>
          {run.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('run.noSources')}</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {run.sources.map((source) => (
                <li key={source.connectorId}>
                  <span className="font-medium text-foreground">
                    {connectorName(source.connectorId)}
                  </span>{' '}
                  · {t('run.attendanceRows', { count: source.attendanceRows })} ·{' '}
                  {t('run.leaveRecords', { count: source.leaveRecords })}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label={t('run.exceptions')} className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{t('run.exceptions')}</h3>
          <p className="text-xs text-muted-foreground">{t('run.exceptionsDescription')}</p>
          {run.exceptions.length === 0 ? (
            <p className="pt-2 text-sm text-muted-foreground">{t('run.noExceptions')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {run.exceptions.map((exception) => (
                <ExceptionItem key={exception.id} exception={exception} />
              ))}
            </ul>
          )}
          {run.withheldExceptionCount > 0 ? (
            <p className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
              <EyeOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {t('run.withheld', { count: run.withheldExceptionCount })}
            </p>
          ) : null}
        </section>
      </div>
    </SectionCard>
  );
}
