import type { WorkflowInstanceStep, WorkflowTimelineItem } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';

import { useLocalizedTitle } from '../hooks/use-localized-title';

/** Everything that happened to the request, oldest first: tasks, reminders, messages, the draft record. */
export function InstanceHistory({
  timeline,
  steps,
}: {
  timeline: readonly WorkflowTimelineItem[];
  steps: readonly WorkflowInstanceStep[];
}) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const localized = useLocalizedTitle();
  const stepTitle = (key: string | null) => {
    const step = steps.find((candidate) => candidate.key === key);
    return step ? localized(step) : '';
  };

  return (
    <SectionCard title={t('instance.history')} description={t('instance.historyDescription')}>
      <ol className="space-y-3">
        {timeline.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-foreground">
                {t(`event.${item.type}`, {
                  step: stepTitle(item.stepKey),
                  channel: item.channel ? t(`channel.${item.channel}`) : '',
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={item.occurredAt}>{format.dateTime(item.occurredAt)}</time>
                {' · '}
                {item.actor
                  ? `${item.actor.name} (${tCommon(`roles.${item.actor.role}`)})`
                  : t('instance.system')}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
