import {
  conflictCandidateSchema,
  employeeFieldSchema,
  type EmployeeField,
  type SyncPreviewItem,
  type SyncRunDetail,
} from '@huitong/shared';
import { ArrowRight, GitCompareArrows, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { StatusBadge } from '@/components/common/status-badge';
import { FieldValue } from '@/features/employees/components/field-value';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';

import { PossibleMatchList } from './possible-match-list';

const KIND_STYLE = {
  CREATE: { tone: 'success', icon: Plus },
  UPDATE: { tone: 'info', icon: RefreshCw },
  CONFLICT: { tone: 'warning', icon: GitCompareArrows },
} as const;

/** A conflict has no single new value: its `after` holds what each system says. */
const previewCandidatesSchema = z.array(
  conflictCandidateSchema.pick({ connectorId: true, value: true }),
);

function ChangeValue({ item, field }: { item: SyncPreviewItem; field: EmployeeField }) {
  const { t } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const candidates =
    item.kind === 'CONFLICT' ? previewCandidatesSchema.safeParse(item.after) : undefined;
  if (candidates?.success) {
    return (
      <dl className="space-y-1">
        {candidates.data.map((candidate) => (
          <div key={candidate.connectorId} className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{labels.source(candidate.connectorId)}:</dt>
            <dd className="font-medium text-foreground">
              <FieldValue field={field} value={candidate.value} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">
        <FieldValue field={field} value={item.before} />
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground" aria-label={t('sync.preview.to')} />
      <span className="font-medium text-foreground">
        <FieldValue field={field} value={item.after} />
      </span>
    </span>
  );
}

function PreviewRow({ item }: { item: SyncPreviewItem }) {
  const { t } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const field = employeeFieldSchema.safeParse(item.field);
  const { tone, icon: Icon } = KIND_STYLE[item.kind];
  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-2 font-mono text-xs tabular-nums">{item.employeeNo}</td>
      <td className="px-3 py-2">
        <StatusBadge tone={tone} icon={<Icon aria-hidden="true" />}>
          {t(`sync.preview.kind.${item.kind}`)}
        </StatusBadge>
      </td>
      <td className="px-3 py-2">
        {field.success ? labels.field(field.data) : t('sync.preview.wholeRecord')}
      </td>
      <td className="px-3 py-2">
        {field.success ? (
          <ChangeValue item={item} field={field.data} />
        ) : (
          <>
            <span className="text-muted-foreground">{t('sync.preview.newRecord')}</span>
            {item.possibleMatches?.length ? (
              <PossibleMatchList matches={item.possibleMatches} />
            ) : null}
          </>
        )}
      </td>
    </tr>
  );
}

/** What a previewed sync would change, record by record; values are masked for the viewer. */
export function SyncPreview({ run }: { run: SyncRunDetail }) {
  const { t } = useTranslation('connectors');
  if (run.previewItems.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="max-h-72 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('sync.preview.caption')}</caption>
          <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('sync.preview.employee')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('sync.preview.change')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('sync.preview.field')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('sync.preview.value')}
              </th>
            </tr>
          </thead>
          <tbody>
            {run.previewItems.map((item, index) => (
              <PreviewRow
                key={`${item.employeeNo}-${item.field ?? 'record'}-${String(index)}`}
                item={item}
              />
            ))}
          </tbody>
        </table>
      </div>
      {run.previewTruncated ? (
        <p className="text-xs text-muted-foreground">
          {t('sync.preview.truncated', { count: run.previewItems.length })}
        </p>
      ) : null}
    </div>
  );
}
