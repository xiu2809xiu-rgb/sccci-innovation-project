import type { EmployeeSummary, EmploymentStatus, ListEnvelope } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { GitCompareArrows, SearchX, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn, SortState } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge, type StatusTone } from '@/components/common/status-badge';

import { useEmployeeLabels } from '../hooks/use-employee-labels';

const STATUS_TONE: Record<EmploymentStatus, StatusTone> = {
  ACTIVE: 'success',
  PROBATION: 'info',
  ON_LEAVE: 'warning',
  TERMINATED: 'neutral',
  PRE_HIRE: 'primary',
};

export interface EmployeeTableProps {
  query: UseQueryResult<ListEnvelope<EmployeeSummary>>;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onPageChange: (page: number) => void;
  onOpen: (employeeNo: string) => void;
  filtered: boolean;
  emptyAction?: ReactNode;
}

/** The employee list: one row per person in the master, the name opening the record drawer. */
export function EmployeeTable({
  query,
  sort,
  onSortChange,
  onPageChange,
  onOpen,
  filtered,
  emptyAction,
}: EmployeeTableProps) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();

  const columns: DataTableColumn<EmployeeSummary>[] = [
    {
      id: 'name',
      header: t('table.name'),
      sortable: true,
      cell: (row) => (
        <button
          type="button"
          className="flex flex-col items-start rounded-md text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t('actions.openRecord', { name: row.fullNameLatin })}
          onClick={() => {
            onOpen(row.employeeNo);
          }}
        >
          <span className="font-medium text-foreground">{row.fullNameLatin}</span>
          {row.fullNameLocal ? (
            <span className="text-xs text-muted-foreground" lang="zh-CN">
              {row.fullNameLocal}
            </span>
          ) : null}
        </button>
      ),
    },
    {
      id: 'employeeNo',
      header: t('table.employeeNo'),
      sortable: true,
      cell: (row) => <span className="font-mono text-xs tabular-nums">{row.employeeNo}</span>,
    },
    { id: 'entity', header: t('table.entity'), cell: (row) => labels.entity(row.entityCode) },
    {
      id: 'department',
      header: t('table.department'),
      sortable: true,
      cell: (row) => labels.department(row.departmentCode),
    },
    {
      id: 'jobTitle',
      header: t('table.jobTitle'),
      className: 'max-w-56',
      cell: (row) => <span className="line-clamp-2">{row.jobTitle}</span>,
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: (row) => (
        <StatusBadge tone={STATUS_TONE[row.employmentStatus]}>
          {labels.employmentStatus(row.employmentStatus)}
        </StatusBadge>
      ),
    },
    {
      id: 'sources',
      header: t('table.sources'),
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.sources.map((source) => (
            <StatusBadge key={source} tone="neutral">
              {labels.source(source)}
            </StatusBadge>
          ))}
        </span>
      ),
    },
    {
      id: 'conflicts',
      header: t('table.conflicts'),
      align: 'end',
      cell: (row) =>
        row.openConflictCount > 0 ? (
          <StatusBadge tone="warning" icon={<GitCompareArrows aria-hidden="true" />}>
            {t('table.conflictCount', { count: row.openConflictCount })}
          </StatusBadge>
        ) : (
          <span className="text-subtle-foreground">{t('table.noConflicts')}</span>
        ),
    },
  ];

  return (
    <DataTable
      caption={t('table.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(row) => row.employeeNo}
      status={query.status}
      error={query.error}
      onRetry={() => {
        void query.refetch();
      }}
      sort={sort}
      onSortChange={onSortChange}
      {...(query.data
        ? {
            pagination: {
              page: query.data.meta.page,
              pageSize: query.data.meta.pageSize,
              total: query.data.meta.total,
              onPageChange,
            },
          }
        : {})}
      empty={
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t('empty.filtered.title')}
            description={t('empty.filtered.description')}
          />
        ) : (
          <EmptyState
            icon={Users}
            title={t('empty.none.title')}
            description={t('empty.none.description')}
            action={emptyAction}
          />
        )
      }
    />
  );
}
