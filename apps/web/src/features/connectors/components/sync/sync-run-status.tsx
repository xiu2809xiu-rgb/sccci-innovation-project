import type { SyncCounts, SyncRun } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/common/status-badge';
import { Progress } from '@/components/ui/progress';
import { useFormatters } from '@/hooks/use-formatters';

import { isFinished } from '../../api/sync-runs';
import { RUN_STATUS_TONE } from '../../connector-status';

const COUNT_KEYS: readonly (keyof SyncCounts)[] = [
  'fetched',
  'created',
  'updated',
  'unchanged',
  'conflicts',
  'errors',
];

/** The figures of a run, labelled; used live while it works and as its summary afterwards. */
export function SyncCountsList({ counts }: { counts: SyncCounts }) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {COUNT_KEYS.map((key) => (
        <div key={key} className="rounded-md border border-border bg-background px-2.5 py-2">
          <dt className="text-xs text-muted-foreground">{t(`sync.counts.${key}`)}</dt>
          <dd className="text-base font-semibold text-foreground tabular-nums">
            {format.integer(counts[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A run's live state: status, the stage it is in and how far it has got. */
export function SyncRunStatus({ run }: { run: SyncRun }) {
  const { t } = useTranslation('connectors');
  const finished = isFinished(run.status);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={RUN_STATUS_TONE[run.status]}>{t(`runStatus.${run.status}`)}</StatusBadge>
        {!finished ? (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {run.stage ? t(`sync.stage.${run.stage}`) : t('sync.waiting')}
          </span>
        ) : null}
      </div>
      <Progress
        value={finished ? 100 : run.progress}
        aria-label={t('sync.progress', { mode: t(`sync.mode.${run.mode}`) })}
      />
      <SyncCountsList counts={run.counts} />
    </div>
  );
}
