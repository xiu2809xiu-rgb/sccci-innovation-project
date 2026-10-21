import type { TransferEntry } from '@huitong/shared';
import { Globe2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DataTablePagination } from '@/components/common/data-table/data-table-pagination';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasPermission } from '@/app/session/use-session';

import { useTransfers } from '../api/governance-queries';
import { ChangeTransferDialog } from '../components/change-transfer-dialog';
import { GovernanceNav } from '../components/governance-nav';
import { TransferCard } from '../components/transfer-card';
import { usePageParam } from '../hooks/use-page-param';

const PAGE_SIZE = 20;

/** The cross-border transfer register, read from the database (story F-4). */
export function TransfersPage() {
  const { t } = useTranslation('governance');
  const [page, setPage] = usePageParam();
  const transfers = useTransfers(page, PAGE_SIZE);
  const canManage = useHasPermission('governance:manage');
  const [changing, setChanging] = useState<TransferEntry | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('transfers.title')}
        description={t('transfers.description')}
        meta={<SyntheticDataBadge />}
      />
      <GovernanceNav />
      <QueryView
        query={transfers}
        skeleton={
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        }
        isEmpty={(envelope) => envelope.data.length === 0}
        empty={
          <EmptyState
            icon={Globe2}
            title={t('transfers.empty.title')}
            description={t('transfers.empty.description')}
          />
        }
      >
        {(envelope) => (
          <FadeContent trigger="mount" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              {envelope.data.map((entry) => (
                <TransferCard
                  key={entry.id}
                  entry={entry}
                  onChange={canManage ? setChanging : undefined}
                />
              ))}
            </div>
            {envelope.meta.total > PAGE_SIZE ? (
              <DataTablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={envelope.meta.total}
                onPageChange={setPage}
              />
            ) : null}
          </FadeContent>
        )}
      </QueryView>
      {changing ? (
        <ChangeTransferDialog
          entry={changing}
          onClose={() => {
            setChanging(null);
          }}
        />
      ) : null}
    </div>
  );
}
