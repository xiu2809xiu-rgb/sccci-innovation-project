import type { Conflict } from '@huitong/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { RelativeTime } from '@/components/common/relative-time';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { FieldValue } from './field-value';
import { ManualValueInput } from './manual-value-input';
import { canEnterManually, MANUAL } from './resolve-request';

export interface ResolveOptionsProps {
  conflict: Conflict;
  /** A connector id, {@link MANUAL}, or '' before a choice. */
  choice: string;
  onChoiceChange: (choice: string) => void;
  manual: string;
  onManualChange: (value: string) => void;
}

/** Each system's value as an option, with when it was seen, and a typed value where one fits. */
export function ResolveOptions({
  conflict,
  choice,
  onChoiceChange,
  manual,
  onManualChange,
}: ResolveOptionsProps) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const baseId = useId();

  return (
    <RadioGroup value={choice} onValueChange={onChoiceChange} aria-label={t('resolve.options')}>
      {conflict.candidates.map((candidate) => {
        const id = `${baseId}-${candidate.connectorId}`;
        return (
          <div
            key={candidate.connectorId}
            className="flex items-start gap-3 rounded-md border border-border p-3 has-data-checked:border-primary"
          >
            <RadioGroupItem id={id} value={candidate.connectorId} className="mt-0.5" />
            <Label htmlFor={id} className="flex flex-1 flex-col items-start gap-1 font-normal">
              <span className="font-medium">
                {t('resolve.keep', { source: labels.source(candidate.connectorId) })}
              </span>
              <span className="text-foreground">
                <FieldValue field={conflict.field} value={candidate.value} />
              </span>
              <span className="text-xs text-muted-foreground">
                {t('resolve.observed')} <RelativeTime value={candidate.observedAt} />
              </span>
            </Label>
          </div>
        );
      })}
      {canEnterManually(conflict.field) ? (
        <div className="space-y-2 rounded-md border border-border p-3 has-data-checked:border-primary">
          <div className="flex items-center gap-3">
            <RadioGroupItem id={`${baseId}-option`} value={MANUAL} />
            <Label id={`${baseId}-label`} htmlFor={`${baseId}-option`} className="font-medium">
              {t('resolve.manual')}
            </Label>
          </div>
          {choice === MANUAL ? (
            <ManualValueInput
              id={baseId}
              labelledBy={`${baseId}-label`}
              field={conflict.field}
              value={manual}
              onChange={onManualChange}
            />
          ) : null}
        </div>
      ) : null}
    </RadioGroup>
  );
}
