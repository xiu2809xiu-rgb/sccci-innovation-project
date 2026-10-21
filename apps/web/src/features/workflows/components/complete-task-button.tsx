import type { WorkflowTaskView } from '@huitong/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { UnavailableButton } from '@/components/common/unavailable-button';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';

import { useCompleteTask } from '../api/workflow-queries';

/**
 * Completes one task. While the list is typed sample data there is nothing
 * to complete, so the button stays focusable and says why it does nothing.
 */
export function CompleteTaskButton({ task, sample }: { task: WorkflowTaskView; sample: boolean }) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const complete = useCompleteTask();
  const label = `${t('actions.markDone')}: ${task.title}`;

  if (sample) {
    return (
      <UnavailableButton
        label={t('actions.markDone')}
        ariaLabel={label}
        reason={t('tasks.markDoneSample')}
        icon={Check}
        size="sm"
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      disabled={complete.isPending}
      onClick={() => {
        complete.mutate(
          { taskId: task.id, body: {} },
          {
            onSuccess: () => toast.success(t('tasks.markedDone')),
            onError: (error) =>
              toast.error(
                error instanceof ApiError
                  ? tCommon(`errors.${error.code}`)
                  : tCommon('states.error.description'),
              ),
          },
        );
      }}
    >
      <Check aria-hidden="true" data-icon="inline-start" />
      {t('actions.markDone')}
    </Button>
  );
}
