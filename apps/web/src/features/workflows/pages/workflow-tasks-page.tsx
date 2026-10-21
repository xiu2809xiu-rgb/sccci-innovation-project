import {
  workflowTaskScopeSchema,
  workflowTaskStateSchema,
  type WorkflowTaskScope,
  type WorkflowTaskState,
  type WorkflowTaskView,
} from '@huitong/shared';
import { ArrowLeft, ListChecks } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useHasPermission, useSession } from '@/app/session/use-session';

import { useWorkflowTasks } from '../api/workflow-queries';
import { TaskTable } from '../components/task-table';

const PAGE_SIZE = 25;
const STATES: readonly WorkflowTaskState[] = ['open', 'done', 'all'];

type UrlChanges = Partial<Record<'scope' | 'state' | 'page', string | null>>;

/** Onboarding work waiting for the caller's role, and every role's for those who manage workflows. */
export function WorkflowTasksPage() {
  const { t } = useTranslation('workflows');
  const [params, setParams] = useSearchParams();
  const { role } = useSession();
  const canManage = useHasPermission('workflows:manage');
  const scopeParam = workflowTaskScopeSchema.safeParse(params.get('scope'));
  const scope: WorkflowTaskScope = canManage && scopeParam.success ? scopeParam.data : 'mine';
  const stateParam = workflowTaskStateSchema.safeParse(params.get('state'));
  const state: WorkflowTaskState = stateParam.success ? stateParam.data : 'open';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const tasks = useWorkflowTasks({ scope, state, page, pageSize: PAGE_SIZE });

  const update = useCallback(
    (changes: UrlChanges) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  // The assignee role completes its own tasks; other roles see them for oversight only.
  const canComplete = useCallback((task: WorkflowTaskView) => task.assigneeRole === role, [role]);

  const empty = (
    <EmptyState
      icon={ListChecks}
      title={state === 'done' ? t('tasks.empty.doneTitle') : t('tasks.empty.openTitle')}
      description={t('tasks.empty.description')}
      action={
        canManage && scope === 'mine' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              update({ scope: 'all', page: null });
            }}
          >
            {t('tasks.empty.seeAll')}
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tasks.title')}
        description={t('tasks.description')}
        meta={
          <>
            <SyntheticDataBadge />
            {tasks.data?.meta.mock ? <MockBadge kind="data" /> : null}
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/workflows">
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              {t('actions.backToBoard')}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        {canManage ? (
          <ToggleGroup
            type="single"
            variant="outline"
            value={scope}
            aria-label={t('tasks.scope.label')}
            onValueChange={(value) => {
              if (value) update({ scope: value === 'mine' ? null : value, page: null });
            }}
          >
            <ToggleGroupItem value="mine">{t('tasks.scope.mine')}</ToggleGroupItem>
            <ToggleGroupItem value="all">{t('tasks.scope.all')}</ToggleGroupItem>
          </ToggleGroup>
        ) : null}
        <ToggleGroup
          type="single"
          variant="outline"
          value={state}
          aria-label={t('tasks.state.label')}
          onValueChange={(value) => {
            if (value) update({ state: value === 'open' ? null : value, page: null });
          }}
        >
          {STATES.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {t(`tasks.state.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <FadeContent trigger="mount">
        <TaskTable
          query={tasks}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => {
            update({ page: next === 1 ? null : String(next) });
          }}
          canComplete={canComplete}
          empty={empty}
        />
      </FadeContent>
    </div>
  );
}
