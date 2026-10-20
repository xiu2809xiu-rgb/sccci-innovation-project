import type { Conflict } from '@huitong/shared';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { RelativeTime } from '@/components/common/relative-time';
import { Button } from '@/components/ui/button';

import { useOpenConflicts } from '../api/employee-queries';
import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { FieldValue } from './field-value';

/** HR's work queue: every open disagreement between systems, oldest decisions waiting first. */
export function ConflictQueue({
  onOpenRecord,
  onResolve,
}: {
  onOpenRecord: (employeeNo: string) => void;
  onResolve?: (conflict: Conflict) => void;
}) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const query = useOpenConflicts();

  const columns: DataTableColumn<Conflict>[] = [
    {
      id: 'employee',
      header: t('conflicts.employee'),
      cell: (conflict) => (
        <button
          type="button"
          className="flex flex-col items-start rounded-md text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t('actions.openRecord', { name: conflict.employeeName })}
          onClick={() => {
            onOpenRecord(conflict.employeeNo);
          }}
        >
          <span className="font-medium text-foreground">{conflict.employeeName}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {conflict.employeeNo} · {labels.entity(conflict.entityCode)}
          </span>
        </button>
      ),
    },
    { id: 'field', header: t('conflicts.field'), cell: (conflict) => labels.field(conflict.field) },
    {
      id: 'values',
      header: t('conflicts.values'),
      cell: (conflict) => (
        <dl className="space-y-1">
          {conflict.candidates.map((candidate) => (
            <div key={candidate.connectorId} className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">{labels.source(candidate.connectorId)}:</dt>
              <dd className="font-medium text-foreground">
                <FieldValue field={conflict.field} value={candidate.value} />
              </dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      id: 'detected',
      header: t('conflicts.detected'),
      cell: (conflict) => (
        <RelativeTime value={conflict.detectedAt} className="text-muted-foreground" />
      ),
    },
    ...(onResolve
      ? [
          {
            id: 'actions',
            header: t('conflicts.actions'),
            align: 'end' as const,
            cell: (conflict: Conflict) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onResolve(conflict);
                }}
              >
                {t('actions.resolve')}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      caption={t('conflicts.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(conflict) => conflict.id}
      status={query.status}
      error={query.error}
      onRetry={() => {
        void query.refetch();
      }}
      skeletonRows={4}
      empty={
        <EmptyState
          icon={CheckCircle2}
          title={t('conflicts.empty.title')}
          description={t('conflicts.empty.description')}
        />
      }
    />
  );
}
