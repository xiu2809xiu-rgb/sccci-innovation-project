import {
  ENTITY_CODES,
  type AccessMatrix,
  type ClassificationEntry,
  type ClassificationLevel,
  type ListEnvelope,
} from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ClassificationBadge } from '@/components/common/classification-badge';
import { DataTable } from '@/components/common/data-table/data-table';
import type { DataTableColumn } from '@/components/common/data-table/data-table-types';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatters } from '@/hooks/use-formatters';

import { clearanceRulesOf, entitiesCleared } from '../access-matrix';
import { useFieldLabel } from '../hooks/use-field-label';
import { ChipList } from './chip-list';

export interface ClassificationTableProps {
  query: UseQueryResult<ListEnvelope<ClassificationEntry>>;
  /** The live policy, to say who may see each level: undefined while it loads, null if it failed. */
  matrix: AccessMatrix | null | undefined;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Each role that reads employee records, with the entities whose records it is cleared to see at a level (story F-3). */
function rolesCleared(matrix: AccessMatrix, level: ClassificationLevel) {
  const rules = clearanceRulesOf(matrix);
  return matrix.roles
    .filter((row) => row.permissions.includes('employees:read'))
    .map((row) => ({ role: row.role, entities: entitiesCleared(rules, row.role, level) }))
    .filter((row) => row.entities.length > 0);
}

/** Every classified field: its level, why, whether it is personal data, and who may see it. */
export function ClassificationTable({
  query,
  matrix,
  page,
  pageSize,
  onPageChange,
}: ClassificationTableProps) {
  const { t, i18n } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const fieldLabel = useFieldLabel();
  const format = useFormatters();
  const chinese = i18n.language === 'zh-CN';

  const visibleTo = (level: ClassificationLevel) => {
    if (matrix === null) {
      return <span className="text-muted-foreground">{t('classification.visibleUnknown')}</span>;
    }
    if (!matrix) return <Skeleton className="h-4 w-32" />;
    const roles = rolesCleared(matrix, level);
    const everywhere = (entities: readonly string[]) => entities.length === ENTITY_CODES.length;
    if (roles.length === 0) return t('classification.noRole');
    if (roles.length === matrix.roles.length && roles.every((row) => everywhere(row.entities))) {
      return t('classification.allRoles');
    }
    return (
      <ChipList
        items={roles.map(({ role, entities }) =>
          everywhere(entities)
            ? tCommon(`roles.${role}`)
            : t('classification.roleOn', {
                role: tCommon(`roles.${role}`),
                entities: format.list(entities.map((entity) => tCommon(`entities.${entity}`))),
              }),
        )}
      />
    );
  };

  const columns: DataTableColumn<ClassificationEntry>[] = [
    {
      id: 'field',
      header: t('classification.field'),
      cell: (entry) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{fieldLabel(entry.field)}</span>
          <code className="font-mono text-xs text-muted-foreground">{entry.field}</code>
        </span>
      ),
    },
    {
      id: 'level',
      header: t('classification.level'),
      cell: (entry) => <ClassificationBadge level={entry.level} />,
    },
    {
      id: 'why',
      header: t('classification.why'),
      className: 'min-w-64 whitespace-normal text-muted-foreground',
      cell: (entry) => (chinese && entry.descriptionZh ? entry.descriptionZh : entry.description),
    },
    {
      id: 'personal',
      header: t('classification.personal'),
      cell: (entry) => (entry.isPersonalData ? t('yes') : t('no')),
    },
    {
      id: 'sensitive',
      header: t('classification.sensitive'),
      cell: (entry) => (entry.isSensitive ? t('yes') : t('no')),
    },
    {
      id: 'visibleTo',
      header: t('classification.visibleTo'),
      className: 'min-w-48 whitespace-normal',
      cell: (entry) => visibleTo(entry.level),
    },
  ];

  return (
    <DataTable
      caption={t('classification.caption')}
      columns={columns}
      rows={query.data?.data}
      getRowId={(entry) => entry.id}
      status={query.status}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={
        <EmptyState
          icon={Tags}
          title={t('classification.empty.title')}
          description={t('classification.empty.description')}
        />
      }
      pagination={
        query.data ? { page, pageSize, total: query.data.meta.total, onPageChange } : undefined
      }
    />
  );
}
