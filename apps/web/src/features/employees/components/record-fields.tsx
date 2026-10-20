import type { EmployeeDetail, EmployeeField, EmployeeFieldView } from '@huitong/shared';
import { Check, EqualNot, GitCompareArrows, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ClassificationBadge } from '@/components/common/classification-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { FieldValue } from './field-value';

/** Fields grouped the way HR reads a record (Gestalt: proximity and common region). */
type GroupKey = 'identity' | 'contact' | 'job' | 'employment' | 'personal' | 'pay';

const GROUPS: readonly { key: GroupKey; fields: readonly EmployeeField[] }[] = [
  {
    key: 'identity',
    fields: ['familyName', 'givenName', 'fullNameLatin', 'fullNameLocal', 'preferredName'],
  },
  { key: 'contact', fields: ['workEmail', 'workPhone'] },
  {
    key: 'job',
    fields: [
      'departmentCode',
      'jobTitle',
      'jobTitleZh',
      'jobGrade',
      'managerEmployeeNo',
      'costCenter',
      'workLocation',
    ],
  },
  {
    key: 'employment',
    fields: ['employmentType', 'employmentStatus', 'hireDate', 'terminationDate'],
  },
  { key: 'personal', fields: ['dateOfBirth'] },
  { key: 'pay', fields: ['baseSalary', 'bankName', 'bankAccountLast4'] },
];

function SourceCell({ view, connectorId }: { view: EmployeeFieldView; connectorId: string }) {
  const { t } = useTranslation('employees');
  const held = view.sources.find((source) => source.connectorId === connectorId);
  if (!held) {
    return (
      <span className="inline-flex items-center gap-1 text-subtle-foreground">
        <Minus className="size-3.5" aria-hidden="true" />
        {t('drawer.notHeld')}
      </span>
    );
  }
  return (
    <span
      className={cn('inline-flex items-start gap-1.5', !held.agrees && 'font-medium text-warning')}
    >
      {held.agrees ? (
        <Check className="mt-0.5 size-3.5 flex-none text-success" aria-label={t('drawer.agrees')} />
      ) : (
        <EqualNot className="mt-0.5 size-3.5 flex-none" aria-label={t('drawer.differs')} />
      )}
      <FieldValue field={view.field} value={held.value} />
    </span>
  );
}

/**
 * The record with every source side by side: the master's value, why it
 * holds it, and what each system says, with disagreements and open conflicts
 * marked by an icon as well as colour (WCAG 1.4.1).
 */
export function RecordFields({
  detail,
  onResolve,
}: {
  detail: EmployeeDetail;
  onResolve?: (conflictId: string) => void;
}) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const byField = new Map(detail.fields.map((view) => [view.field, view]));
  const connectors = [
    ...new Set(detail.fields.flatMap((view) => view.sources.map((source) => source.connectorId))),
  ].sort();

  const truth = (view: EmployeeFieldView) => {
    const source = view.sourceOfTruth.connectorId
      ? labels.source(view.sourceOfTruth.connectorId)
      : '';
    return t(`drawer.sourceOfTruth.${view.sourceOfTruth.kind}`, { source });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-xl text-sm">
        <caption className="sr-only">{t('drawer.caption', { name: detail.fullNameLatin })}</caption>
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-1/3 px-3 py-2 font-medium">
              {t('drawer.field')}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t('drawer.master')}
            </th>
            {connectors.map((connectorId) => (
              <th key={connectorId} scope="col" className="px-3 py-2 font-medium">
                {labels.source(connectorId)}
              </th>
            ))}
          </tr>
        </thead>
        {GROUPS.map((group) => (
          <tbody key={group.key} className="border-t border-border">
            <tr>
              <th
                scope="rowgroup"
                colSpan={2 + connectors.length}
                className="bg-background px-3 pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {t(`groups.${group.key}`)}
              </th>
            </tr>
            {group.fields.map((field) => {
              const view = byField.get(field);
              if (!view) return null;
              const conflictId = view.openConflictId;
              return (
                <tr key={field} className={cn('align-top', conflictId && 'bg-warning-subtle')}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                      {labels.field(field)}
                      {view.classification === 'CONFIDENTIAL' ||
                      view.classification === 'RESTRICTED' ? (
                        <ClassificationBadge level={view.classification} />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {truth(view)}
                    </span>
                    {conflictId && onResolve ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          onResolve(conflictId);
                        }}
                      >
                        <GitCompareArrows aria-hidden="true" data-icon="inline-start" />
                        {t('actions.resolve')}
                      </Button>
                    ) : null}
                  </th>
                  <td className="px-3 py-2 font-medium text-foreground">
                    <FieldValue field={field} value={view.value} />
                  </td>
                  {connectors.map((connectorId) => (
                    <td key={connectorId} className="px-3 py-2">
                      <SourceCell view={view} connectorId={connectorId} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
