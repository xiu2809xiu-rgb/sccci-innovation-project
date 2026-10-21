import type { WorkflowInstanceStep } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusMark } from '@/components/reactbits/status-mark';
import { useFormatters } from '@/hooks/use-formatters';

import { useLocalizedTitle } from '../hooks/use-localized-title';
import { stepMark, TASK_STATUS_TONE } from '../workflow-status';

/** Every step in order, with its owner, its due time and who finished it. */
export function InstanceSteps({ steps }: { steps: readonly WorkflowInstanceStep[] }) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const localized = useLocalizedTitle();

  return (
    <SectionCard title={t('instance.steps')} description={t('instance.stepsDescription')}>
      <ol className="space-y-3">
        {steps.map((step) => {
          const statusText = step.status
            ? t(`taskStatus.${step.status}`)
            : t('instance.notStarted');
          return (
            <li key={step.key} className="flex items-start gap-3">
              <StatusMark status={stepMark(step.status)} statusText={statusText} size={18} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{localized(step)}</p>
                  {step.status ? (
                    <StatusBadge tone={TASK_STATUS_TONE[step.status]}>{statusText}</StatusBadge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tCommon(`roles.${step.assigneeRole}`)}
                  {step.completedAt && step.completedBy
                    ? ` · ${t('instance.doneBy', { name: step.completedBy.name })} · ${format.dateTime(step.completedAt)}`
                    : null}
                  {!step.completedAt && step.dueAt
                    ? ` · ${t('instance.due', { date: format.dateTime(step.dueAt) })}`
                    : null}
                  {step.status === null ? ` · ${t('instance.notStarted')}` : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
