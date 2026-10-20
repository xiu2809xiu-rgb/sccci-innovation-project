import type { EmployeeChange } from '@huitong/shared';
import { ArrowRight, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { RelativeTime } from '@/components/common/relative-time';

import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { FieldValue } from './field-value';

/** Every change to the record, newest first: what changed, from what, and who or what changed it. */
export function EmployeeHistory({ changes }: { changes: EmployeeChange[] }) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();

  if (changes.length === 0) {
    return <EmptyState icon={History} title={t('history.empty')} />;
  }

  const sourceOf = (change: EmployeeChange) => {
    if (change.source === 'SYNC') {
      return t('history.source.SYNC', { source: labels.source(change.connectorId ?? '') });
    }
    return t(`history.source.${change.source}`, { name: change.actor?.displayName ?? '' });
  };

  return (
    <ol className="space-y-2">
      {changes.map((change) => (
        <li key={change.id} className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {labels.field(change.field)}
            </span>
            <RelativeTime value={change.createdAt} className="text-xs text-muted-foreground" />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground line-through decoration-1">
              <FieldValue field={change.field} value={change.oldValue} />
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground" aria-label={t('history.to')} />
            <span className="font-medium text-foreground">
              <FieldValue field={change.field} value={change.newValue} />
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{sourceOf(change)}</p>
        </li>
      ))}
    </ol>
  );
}
