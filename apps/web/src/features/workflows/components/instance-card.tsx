import type { WorkflowInstanceSummary } from '@huitong/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { RelativeTime } from '@/components/common/relative-time';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import { Progress } from '@/components/ui/progress';
import { useFormatters } from '@/hooks/use-formatters';

import { useLocalizedTitle } from '../hooks/use-localized-title';
import { SlaBadge } from './sla-badge';

/** One request on the board: who asked, how far it has got, and what is waiting for whom. */
export function InstanceCard({ instance }: { instance: WorkflowInstanceSummary }) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const localized = useLocalizedTitle();
  const progress = t('card.progress', { done: instance.stepsDone, total: instance.stepsTotal });
  const { nextAction } = instance;

  return (
    <SpotlightCard className="flex flex-col gap-3 p-4" intensity={0.08} proximity={32}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-foreground">
          <Link
            to={`/workflows/${instance.id}`}
            className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {instance.title}
          </Link>
        </h3>
        <SlaBadge sla={instance.sla} />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('card.requestedBy', { name: instance.requestedBy.name })} ·{' '}
        {t('card.positions', { count: instance.headcount })} · {instance.source.requestId}
      </p>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground tabular-nums">{progress}</p>
        <Progress value={(instance.stepsDone / instance.stepsTotal) * 100} aria-label={progress} />
      </div>
      {nextAction ? (
        <div className="space-y-0.5 text-xs">
          <p className="text-foreground">{t('card.next', { step: localized(nextAction) })}</p>
          <p className="flex flex-wrap gap-x-2 text-muted-foreground">
            <span>{t('card.owner', { role: tCommon(`roles.${nextAction.assigneeRole}`) })}</span>
            {nextAction.dueAt ? (
              <span>
                {t('card.dueLabel')} <RelativeTime value={nextAction.dueAt} />
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
      {instance.expectedStartDate ? (
        <p className="text-xs text-muted-foreground">
          {t('card.dayOne', { date: format.date(instance.expectedStartDate) })}
        </p>
      ) : null}
    </SpotlightCard>
  );
}
