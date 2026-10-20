import type { SyncRun } from '@huitong/shared';
import { History } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { RelativeTime } from '@/components/common/relative-time';
import { StatusBadge } from '@/components/common/status-badge';
import { useFormatters } from '@/hooks/use-formatters';

import { useConnectorRuns } from '../api/connector-queries';
import { RUN_STATUS_TONE } from '../connector-status';

/** A connector's sync runs, newest first: previews and applies, with their outcome and figures. */
export function SyncRunHistory({ connectorId }: { connectorId: string }) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const [page, setPage] = useState(1);
  const runs = useConnectorRuns(connectorId, page);

  const columns: DataTableColumn<SyncRun>[] = [
    {
      id: 'queued',
      header: t('detail.runs.queued'),
      cell: (run) => <RelativeTime value={run.queuedAt} />,
    },
    {
      id: 'mode',
      header: t('detail.runs.mode'),
      cell: (run) => (
        <span className="flex flex-col">
          <span>{t(`sync.mode.${run.mode}`)}</span>
          <span className="text-xs text-muted-foreground">
            {t(`detail.runs.trigger.${run.trigger}`)}
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: t('detail.runs.status'),
      cell: (run) => (
        <StatusBadge tone={RUN_STATUS_TONE[run.status]}>{t(`runStatus.${run.status}`)}</StatusBadge>
      ),
    },
    {
      id: 'changes',
      header: t('detail.runs.changes'),
      cell: (run) =>
        t('detail.runs.summary', {
          created: format.integer(run.counts.created),
          updated: format.integer(run.counts.updated),
          conflicts: format.integer(run.counts.conflicts),
          errors: format.integer(run.counts.errors),
        }),
    },
    {
      id: 'by',
      header: t('detail.runs.by'),
      cell: (run) => run.triggeredBy?.displayName ?? t('detail.runs.system'),
    },
    {
      id: 'version',
      header: t('detail.runs.version'),
      align: 'end',
      cell: (run) => (run.mappingVersion === null ? '—' : `v${String(run.mappingVersion)}`),
    },
  ];

  return (
    <DataTable
      caption={t('detail.runs.caption')}
      columns={columns}
      rows={runs.data?.data}
      getRowId={(run) => run.id}
      status={runs.status}
      error={runs.error}
      onRetry={() => {
        void runs.refetch();
      }}
      skeletonRows={5}
      {...(runs.data
        ? {
            pagination: {
              page: runs.data.meta.page,
              pageSize: runs.data.meta.pageSize,
              total: runs.data.meta.total,
              onPageChange: setPage,
            },
          }
        : {})}
      empty={<EmptyState icon={History} title={t('detail.runs.empty')} />}
    />
  );
}
