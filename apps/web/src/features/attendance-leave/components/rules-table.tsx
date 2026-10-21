import {
  TEMPLATE_LEAVE_COLUMNS,
  type LeaveCategoryMapping,
  type ListEnvelope,
} from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { BookOpenCheck, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';

import { RULE_STATUS_TONE } from '../attendance-status';
import { useConnectorName } from '../hooks/use-connector-name';

export interface RulesTableProps {
  query: UseQueryResult<ListEnvelope<LeaveCategoryMapping>>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Absent for roles that may not change rules. */
  onChange?: (rule: LeaveCategoryMapping) => void;
}

/** Each system's leave codes, what they count as, and the template column they land in. */
export function RulesTable({ query, page, pageSize, onPageChange, onChange }: RulesTableProps) {
  const { t, i18n } = useTranslation('attendanceLeave');
  const connectorName = useConnectorName();
  const columnLabel = (label: string | null) => {
    if (label === null) return t('rules.noColumn');
    const column = TEMPLATE_LEAVE_COLUMNS.find((candidate) => candidate.label === label);
    return column && i18n.language === 'zh-CN' ? column.labelZh : label;
  };

  const columns: DataTableColumn<LeaveCategoryMapping>[] = [
    {
      id: 'system',
      header: t('rules.table.system'),
      cell: (rule) => connectorName(rule.connectorId),
    },
    {
      id: 'code',
      header: t('rules.table.code'),
      cell: (rule) => <code className="font-mono text-xs">{rule.sourceCategory}</code>,
    },
    { id: 'label', header: t('rules.table.label'), cell: (rule) => rule.sourceLabel },
    {
      id: 'category',
      header: t('rules.table.category'),
      cell: (rule) => (
        <span className="font-medium text-foreground">
          {t(`category.${rule.canonicalCategory}`)}
        </span>
      ),
    },
    {
      id: 'column',
      header: t('rules.table.column'),
      cell: (rule) => (
        <span className={rule.templateColumn === null ? 'text-warning' : 'text-muted-foreground'}>
          {columnLabel(rule.templateColumn)}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('rules.table.status'),
      cell: (rule) => (
        <StatusBadge tone={RULE_STATUS_TONE[rule.status]}>
          {t(`rules.ruleStatus.${rule.status}`)}
        </StatusBadge>
      ),
    },
    {
      id: 'version',
      header: t('rules.table.version'),
      align: 'end',
      className: 'tabular-nums',
      cell: (rule) => `v${String(rule.version)}`,
    },
  ];
  if (onChange) {
    columns.push({
      id: 'actions',
      header: t('rules.table.actions'),
      align: 'end',
      cell: (rule) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('rules.changeLabel', { code: rule.sourceCategory })}
          onClick={() => {
            onChange(rule);
          }}
        >
          <Pencil aria-hidden="true" data-icon="inline-start" />
          {t('rules.change')}
        </Button>
      ),
    });
  }

  return (
    <DataTable
      caption={t('rules.table.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(rule) => rule.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={
        <EmptyState
          icon={BookOpenCheck}
          title={t('rules.empty.title')}
          description={t('rules.empty.description')}
        />
      }
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
    />
  );
}
