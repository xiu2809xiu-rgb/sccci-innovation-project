import type { ListEnvelope, RetentionPolicy } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { useFormatters } from '@/hooks/use-formatters';

const CATEGORIES = [
  'audit_events',
  'clickstream_events',
  'source_records',
  'terminated_employees',
  'ai_usage_records',
  'refresh_tokens',
] as const;

const isKnownCategory = (category: string): category is (typeof CATEGORIES)[number] =>
  (CATEGORIES as readonly string[]).includes(category);

export interface RetentionTableProps {
  query: UseQueryResult<ListEnvelope<RetentionPolicy>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** How long each kind of data is kept, for whom, and what happens to it at the end. */
export function RetentionTable({ query, page, pageSize, onPageChange }: RetentionTableProps) {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();

  const period = (months: number) =>
    months % 12 === 0
      ? t('retention.years', { count: months / 12 })
      : t('retention.months', { count: months });

  const columns: DataTableColumn<RetentionPolicy>[] = [
    {
      id: 'data',
      header: t('retention.data'),
      cell: (policy) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">
            {isKnownCategory(policy.dataCategory)
              ? t(`retention.category.${policy.dataCategory}`)
              : policy.dataCategory}
          </span>
          <code className="font-mono text-xs text-muted-foreground">{policy.dataCategory}</code>
        </span>
      ),
    },
    {
      id: 'appliesTo',
      header: t('retention.appliesTo'),
      cell: (policy) =>
        policy.entityCode === null
          ? t('retention.groupWide')
          : tCommon(`entities.${policy.entityCode}`),
    },
    {
      id: 'keptFor',
      header: t('retention.keptFor'),
      className: 'tabular-nums',
      cell: (policy) => period(policy.retentionMonths),
    },
    {
      id: 'then',
      header: t('retention.then'),
      cell: (policy) => t(`retention.action.${policy.action}`),
    },
    {
      id: 'legalReference',
      header: t('retention.legalReference'),
      className: 'min-w-56 whitespace-normal text-muted-foreground',
      cell: (policy) => policy.legalReference ?? '—',
    },
    {
      id: 'lastApplied',
      header: t('retention.lastApplied'),
      cell: (policy) =>
        policy.lastAppliedAt ? format.dateTime(policy.lastAppliedAt) : t('retention.never'),
    },
  ];

  return (
    <DataTable
      caption={t('retention.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(policy) => policy.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={
        <EmptyState
          icon={Archive}
          title={t('retention.empty.title')}
          description={t('retention.empty.description')}
        />
      }
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
    />
  );
}
