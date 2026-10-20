import { OVERVIEW_RECENT_RUNS, type RecentSyncRun } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

import { RUN_BAR } from '../overview-labels';

/**
 * The last runs as a row of bars, oldest on the left (an uptime-board pattern
 * HR tools share, Jakob's law). Each bar has a text equivalent for screen readers.
 */
export function RunHistoryStrip({ runs, label }: { runs: RecentSyncRun[]; label: string }) {
  const { t } = useTranslation('overview');
  const { t: tConnectors } = useTranslation('connectors');
  const format = useFormatters();
  const oldestFirst = [...runs].reverse();
  const padding = Math.max(0, OVERVIEW_RECENT_RUNS - oldestFirst.length);

  return (
    <ol aria-label={label} className="flex h-6 items-end gap-0.5">
      {Array.from({ length: padding }, (_, index) => (
        <li
          key={`empty-${String(index)}`}
          aria-hidden="true"
          className="h-6 w-1.5 rounded-sm bg-muted"
        />
      ))}
      {oldestFirst.map((run) => {
        const description = t('syncHealth.run', {
          status: tConnectors(`runStatus.${run.status}`),
          time: format.dateTime(run.finishedAt ?? run.queuedAt),
        });
        return (
          <li
            key={run.id}
            title={description}
            className={cn('w-1.5 rounded-sm', RUN_BAR[run.status])}
          >
            <span className="sr-only">{description}</span>
          </li>
        );
      })}
      {runs.length === 0 ? <li className="sr-only">{t('syncHealth.noRuns')}</li> : null}
    </ol>
  );
}
