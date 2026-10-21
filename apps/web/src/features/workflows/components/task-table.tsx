import type { ListEnvelope, WorkflowTaskView } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { StatusBadge } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

import { useLocalizedTitle } from '../hooks/use-localized-title';
import { isOpenTask, TASK_STATUS_TONE } from '../workflow-status';
import { CompleteTaskButton } from './complete-task-button';
import { SlaBadge } from './sla-badge';

export interface TaskTableProps {
  query: UseQueryResult<ListEnvelope<WorkflowTaskView>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Whether the caller may complete this task (its own role's). */
  canComplete: (task: WorkflowTaskView) => boolean;
  empty: ReactNode;
}

/** The tasks for the selected scope: what, for which request, whose, by when, and the next action. */
export function TaskTable({
  query,
  page,
  pageSize,
  onPageChange,
  canComplete,
  empty,
}: TaskTableProps) {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const localized = useLocalizedTitle();
  const sample = query.data?.meta.mock === true;

  const columns: DataTableColumn<WorkflowTaskView>[] = [
    {
      id: 'task',
      header: t('tasks.table.task'),
      cell: (task) => (
        <Link
          to={`/workflows/${task.instanceId}`}
          className="rounded-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {localized(task)}
        </Link>
      ),
    },
    {
      id: 'request',
      header: t('tasks.table.request'),
      cell: (task) => (
        <span className="text-muted-foreground">
          {task.instanceTitle} · {task.entityCode}
        </span>
      ),
    },
    {
      id: 'owner',
      header: t('tasks.table.owner'),
      cell: (task) => (
        <span className="text-muted-foreground">
          {task.assignee?.name ?? t('tasks.unassigned')} · {tCommon(`roles.${task.assigneeRole}`)}
        </span>
      ),
    },
    {
      id: 'due',
      header: t('tasks.table.due'),
      cell: (task) =>
        task.dueAt ? (
          <span className="flex flex-wrap items-center gap-2 tabular-nums">
            {format.dateTime(task.dueAt)}
            {isOpenTask(task.status) ? <SlaBadge sla={task.sla} /> : null}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'status',
      header: t('tasks.table.status'),
      cell: (task) => (
        <StatusBadge tone={TASK_STATUS_TONE[task.status]}>
          {t(`taskStatus.${task.status}`)}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: t('tasks.table.actions'),
      align: 'end',
      cell: (task) =>
        canComplete(task) && isOpenTask(task.status) ? (
          <CompleteTaskButton task={task} sample={sample} />
        ) : null,
    },
  ];

  return (
    <DataTable
      caption={t('tasks.table.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(task) => task.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={empty}
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
    />
  );
}
