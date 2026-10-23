import type { SyncError, SyncMode } from '@huitong/shared';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useFormatters } from '@/hooks/use-formatters';

import { useSyncErrorText } from '../../hooks/use-sync-error-text';

/** How many employee numbers each reason lists; the count covers the rest. */
const LISTED = 10;

export interface SyncRecordErrorsProps {
  /** The run's errors about single records, as the API keeps them (the first few hundred). */
  errors: readonly SyncError[];
  /** How many records failed in all, which may be more than the API keeps. */
  total: number;
  /** A preview's skipped records would be skipped; an apply's were. */
  mode: SyncMode;
}

/**
 * The records a run skips, grouped by reason with their employee numbers, so
 * HR can correct them at the source (Nielsen: help users recognise, diagnose
 * and recover from errors). It shows the translated reason, never the
 * server's message.
 */
export function SyncRecordErrors({ errors, total, mode }: SyncRecordErrorsProps) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const errorText = useSyncErrorText();
  const byCode = new Map<string, { error: SyncError; employeeNos: string[] }>();
  for (const error of errors) {
    if (error.externalId === null) continue;
    const group = byCode.get(error.code) ?? { error, employeeNos: [] };
    group.employeeNos.push(error.externalId);
    byCode.set(error.code, group);
  }
  const groups = [...byCode.values()];
  const listed = groups.reduce((sum, group) => sum + group.employeeNos.length, 0);
  if (listed === 0) return null;
  const count = Math.max(listed, total);

  return (
    <section
      aria-label={t('sync.recordErrors.label')}
      className="space-y-2 rounded-md border border-warning-border bg-warning-subtle p-3 text-sm"
    >
      <p className="flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
        {mode === 'APPLY'
          ? t('sync.recordErrors.appliedTitle', { count })
          : t('sync.recordErrors.previewTitle', { count })}
      </p>
      <ul className="space-y-2 text-muted-foreground">
        {groups.map(({ error, employeeNos }) => {
          const unlisted = employeeNos.length - LISTED;
          return (
            <li key={error.code} className="space-y-0.5">
              <p>{errorText(error)}</p>
              <p className="tabular-nums">
                {format.list([
                  ...employeeNos.slice(0, LISTED),
                  ...(unlisted > 0 ? [t('sync.recordErrors.more', { count: unlisted })] : []),
                ])}
              </p>
            </li>
          );
        })}
      </ul>
      {count > listed ? (
        <p className="text-muted-foreground">
          {t('sync.recordErrors.listedOnly', { listed: format.number(listed) })}
        </p>
      ) : null}
    </section>
  );
}
