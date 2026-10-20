import type { MappingProposal, MappingTarget } from '@huitong/shared';
import { ArrowLeft, ArrowRight, Sparkles, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';

import { type DraftProblem, type MappingDraft } from './mapping-draft';
import { ProposalRow } from './proposal-row';

export interface ReviewStepProps {
  proposal: MappingProposal;
  draft: MappingDraft;
  retargeted: ReadonlySet<string>;
  problems: readonly DraftProblem[];
  onDraftChange: (draft: MappingDraft) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Step 2: HR checks every suggestion, changes what is wrong and keeps or drops the fixed values. */
export function ReviewStep({
  proposal,
  draft,
  retargeted,
  problems,
  onDraftChange,
  onBack,
  onContinue,
}: ReviewStepProps) {
  const { t } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const baseId = useId();
  const duplicates = new Set(
    problems.flatMap((problem) => (problem.kind === 'duplicate' ? [problem.target] : [])),
  );
  const mapped = Object.values(draft.columns).filter((target) => target !== null).length;
  const flagged = proposal.columns.filter((column) => column.flags.length > 0).length;

  const setTarget = (column: string, target: MappingTarget | null) => {
    onDraftChange({ ...draft, columns: { ...draft.columns, [column]: target } });
  };
  const problemText = (problem: DraftProblem) =>
    problem.kind === 'duplicate'
      ? t('wizard.review.problems.duplicate', { field: labels.field(problem.target) })
      : t(`wizard.review.problems.${problem.kind}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info" icon={<Sparkles aria-hidden="true" />}>
          {t('wizard.review.aiSuggestion')}
        </StatusBadge>
        <StatusBadge tone="warning">{t('proposals.requiresApproval')}</StatusBadge>
        <p className="text-sm text-muted-foreground">
          {t('wizard.review.summary', {
            mapped,
            total: proposal.columns.length,
            flagged,
            rows: proposal.sampleRowCount,
          })}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-3xl text-sm">
          <caption className="sr-only">
            {t('wizard.review.caption', { file: proposal.fileName })}
          </caption>
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('wizard.review.column')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('wizard.review.target')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('wizard.review.transform')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('wizard.review.confidence')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('wizard.review.rationale')}
              </th>
            </tr>
          </thead>
          <tbody>
            {proposal.columns.map((column) => {
              const target = draft.columns[column.sourceColumn] ?? null;
              return (
                <ProposalRow
                  key={column.sourceColumn}
                  column={column}
                  target={target}
                  retargeted={retargeted.has(column.sourceColumn)}
                  duplicate={target !== null && duplicates.has(target)}
                  onChange={(next) => {
                    setTarget(column.sourceColumn, next);
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {proposal.fixedValues.length > 0 ? (
        <fieldset className="space-y-2 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            {t('wizard.review.fixedTitle')}
          </legend>
          <p className="text-sm text-muted-foreground">{t('wizard.review.fixedDescription')}</p>
          {proposal.fixedValues.map((fixed) => {
            const id = `${baseId}-${fixed.target}`;
            return (
              <div key={fixed.target} className="flex items-start gap-3">
                <Checkbox
                  id={id}
                  checked={draft.constants[fixed.target] === true}
                  onCheckedChange={(checked) => {
                    onDraftChange({
                      ...draft,
                      constants: { ...draft.constants, [fixed.target]: checked === true },
                    });
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor={id} className="flex flex-col items-start gap-0.5 font-normal">
                  <span className="font-medium">
                    {t('wizard.review.fixedValue', {
                      field: labels.field(fixed.target),
                      value: fixed.value,
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">{fixed.rationale}</span>
                </Label>
              </div>
            );
          })}
        </fieldset>
      ) : null}

      {problems.length > 0 ? (
        <div
          role="alert"
          className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-sm"
        >
          <p className="flex items-center gap-2 font-medium text-danger">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {t('wizard.review.problems.title')}
          </p>
          <ul className="mt-1 list-disc pl-6 text-foreground">
            {problems.map((problem) => (
              <li key={problem.kind === 'duplicate' ? `duplicate-${problem.target}` : problem.kind}>
                {problemText(problem)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          {t('wizard.review.back')}
        </Button>
        <Button type="button" disabled={problems.length > 0} onClick={onContinue}>
          {t('wizard.review.continue')}
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
