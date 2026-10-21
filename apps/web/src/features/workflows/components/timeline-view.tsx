import type { WorkflowInstanceSummary } from '@huitong/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';

import { SlaBadge } from './sla-badge';

const DAY = 86_400_000;

/** Where a time falls between the earliest approval and the latest day one, as a percentage. */
function scale(instances: readonly WorkflowInstanceSummary[]) {
  const times = instances.flatMap((instance) => [
    Date.parse(instance.source.approvedAt),
    Date.parse(instance.expectedStartDate ?? instance.source.approvedAt),
  ]);
  const start = Math.min(...times) - DAY;
  const span = Math.max(Math.max(...times) + DAY - start, DAY);
  return (time: number) => Math.min(100, Math.max(0, ((time - start) / span) * 100));
}

/**
 * Each request from its OA approval to the day one it asked for, with the
 * time already used filled in. The bars are decoration: every row also says
 * the same thing in words.
 */
export function TimelineView({ instances }: { instances: readonly WorkflowInstanceSummary[] }) {
  const { t } = useTranslation('workflows');
  const format = useFormatters();
  const now = useNow().getTime();
  const at = scale(instances);
  const today = at(now);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
        <span className="inline-block h-3 w-px bg-foreground" />
        {t('timeline.today')}
      </p>
      <ol
        aria-label={t('timeline.label')}
        className="divide-y divide-border rounded-lg border border-border"
      >
        {instances.map((instance) => {
          const approved = Date.parse(instance.source.approvedAt);
          const dayOne = Date.parse(instance.expectedStartDate ?? instance.source.approvedAt);
          const left = at(approved);
          const width = Math.max(at(dayOne) - left, 1);
          const used = Math.min(Math.max((now - approved) / Math.max(dayOne - approved, 1), 0), 1);
          return (
            <li key={instance.id} className="grid gap-3 p-4 md:grid-cols-12 md:items-center">
              <div className="min-w-0 space-y-1 md:col-span-4">
                <Link
                  to={`/workflows/${instance.id}`}
                  className="block truncate rounded-sm text-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {instance.title}
                </Link>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t('timeline.summary', {
                    approved: format.date(instance.source.approvedAt),
                    dayOne: instance.expectedStartDate
                      ? format.date(instance.expectedStartDate)
                      : '—',
                    done: instance.stepsDone,
                    total: instance.stepsTotal,
                  })}
                </p>
              </div>
              <div className="relative h-3 md:col-span-6" aria-hidden="true">
                <div className="absolute inset-x-0 inset-y-1 rounded-full bg-muted" />
                <div
                  className="absolute inset-y-1 overflow-hidden rounded-full bg-primary-subtle"
                  style={{ left: `${String(left)}%`, width: `${String(width)}%` }}
                >
                  <div
                    className={cn(
                      'h-full rounded-full',
                      instance.sla === 'OVERDUE' ? 'bg-danger' : 'bg-primary',
                    )}
                    style={{ width: `${String(used * 100)}%` }}
                  />
                </div>
                <div
                  className="absolute inset-y-0 w-px bg-foreground"
                  style={{ left: `${String(today)}%` }}
                />
              </div>
              <div className="md:col-span-2 md:justify-self-end">
                <SlaBadge sla={instance.sla} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
