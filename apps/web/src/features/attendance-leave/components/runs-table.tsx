import type { ConsolidationRunSummary, ListEnvelope } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

import { RUN_STATUS_TONE } from '../attendance-status';
import { usePeriods } from '../hooks/use-periods';

export interface RunsTableProps {
  query: UseQueryResult<ListEnvelope<ConsolidationRunSummary>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedId: string | null;
}

/** Every consolidation, newest first; a month opens its sources and exceptions beside the table. */
export function RunsTable({ query, page, pageSize, onPageChange, selectedId }: RunsTableProps) {
  const { t } = useTranslation('attendanceLeave');
  const format = useFormatters();
  const { label } = usePeriods();

  const columns: DataTableColumn<ConsolidationRunSummary>[] = [
    {
      id: 'period',
      header: t('runs.table.period'),
      cell: (run) => (
        <Link
          to={`?run=${run.id}`}
          aria-current={run.id === selectedId ? 'true' : undefined}
          className="rounded-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=true]:underline"
        >
          {label(run.period)}
        </Link>
      ),
    },
    {
      id: 'status',
      header: t('runs.table.status'),
      cell: (run) => (
        <StatusBadge tone={RUN_STATUS_TONE[run.status]}>{t(`status.${run.status}`)}</StatusBadge>
      ),
    },
    {
      id: 'employees',
      header: t('runs.table.employees'),
      align: 'end',
      className: 'tabular-nums',
      cell: (run) => format.integer(run.employeeCount),
    },
    {
      id: 'records',
      header: t('runs.table.records'),
      align: 'end',
      className: 'tabular-nums',
      cell: (run) => format.integer(run.recordCount),
    },
    {
      id: 'exceptions',
      header: t('runs.table.exceptions'),
      align: 'end',
      className: 'tabular-nums',
      cell: (run) =>
        `${format.integer(run.openExceptionCount)} / ${format.integer(run.exceptionCount)}`,
    },
    {
      id: 'finished',
      header: t('runs.table.finished'),
      cell: (run) => (run.finishedAt ? format.dateTime(run.finishedAt) : '—'),
    },
  ];

  return (
    <DataTable
      caption={t('runs.table.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(run) => run.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={
        <EmptyState
          icon={CalendarCheck}
          title={t('runs.empty.title')}
          description={t('runs.empty.description')}
        />
      }
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
      skeletonRows={3}
    />
  );
}
