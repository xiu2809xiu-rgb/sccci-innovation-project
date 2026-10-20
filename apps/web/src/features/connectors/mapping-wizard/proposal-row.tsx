import {
  LOW_CONFIDENCE_THRESHOLD,
  MAPPING_TARGETS,
  mappingTargetSchema,
  type MappingTarget,
  type ProposalColumn,
} from '@huitong/shared';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { StatusBadge, type StatusTone } from '@/components/common/status-badge';
import { ThoughtLine } from '@/components/reactbits/thought-line';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';
import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

import { useTransformLabel } from '../hooks/use-transform-label';

const NONE = 'none';
const FLAG_TONE: Record<ProposalColumn['flags'][number], StatusTone> = {
  PROHIBITED_FIELD: 'danger',
  LOW_CONFIDENCE: 'warning',
  NO_MATCH: 'neutral',
  REVIEW_TRANSFORM: 'info',
};

export interface ProposalRowProps {
  column: ProposalColumn;
  target: MappingTarget | null;
  /** HR pointed the column at another field, so its transform became a plain copy. */
  retargeted: boolean;
  duplicate: boolean;
  onChange: (target: MappingTarget | null) => void;
}

/** One column of the sample: the AI's suggestion, its confidence and reasons, and HR's choice. */
export function ProposalRow({ column, target, retargeted, duplicate, onChange }: ProposalRowProps) {
  const { t } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const describe = useTransformLabel();
  const format = useFormatters();
  const prohibited = column.flags.includes('PROHIBITED_FIELD');
  const low = column.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <tr className={cn('border-t border-border align-top', prohibited && 'bg-danger-subtle/40')}>
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <span className="block font-medium text-foreground">{column.sourceColumn}</span>
        <span className="block font-mono text-xs text-muted-foreground">{column.sampleShape}</span>
      </th>
      <td className="px-3 py-2">
        {prohibited ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-danger">
            <Lock className="size-3.5" aria-hidden="true" />
            {t(
              column.prohibitedKind === 'GENDER'
                ? 'wizard.review.neverMappedGender'
                : 'wizard.review.neverMapped',
            )}
          </span>
        ) : (
          <Select
            value={target ?? NONE}
            onValueChange={(value) => {
              const parsed = mappingTargetSchema.safeParse(value);
              onChange(parsed.success ? parsed.data : null);
            }}
          >
            <SelectTrigger
              className={cn('w-52', duplicate && 'border-danger')}
              aria-label={t('wizard.review.targetFor', { column: column.sourceColumn })}
              aria-invalid={duplicate}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('wizard.review.notMapped')}</SelectItem>
              {MAPPING_TARGETS.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels.field(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        {target === null ? (
          <span className="text-subtle-foreground">—</span>
        ) : retargeted || !column.transform ? (
          <span className="text-warning">{t('wizard.review.plainCopy')}</span>
        ) : (
          describe(column.transform)
        )}
      </td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span
              className={cn('block h-full rounded-full', low ? 'bg-warning' : 'bg-primary')}
              style={{ width: `${String(Math.round(column.confidence * 100))}%` }}
            />
          </span>
          <span className="text-sm tabular-nums">{format.percent(column.confidence, 0)}</span>
        </span>
        <span className="mt-1 flex flex-wrap gap-1">
          {column.flags.map((flag) => (
            <StatusBadge key={flag} tone={FLAG_TONE[flag]}>
              {t(`wizard.review.flags.${flag}`)}
            </StatusBadge>
          ))}
        </span>
      </td>
      <td className="max-w-sm px-3 py-2">
        <ThoughtLine
          label={t('wizard.review.why')}
          doneLabel={t('wizard.review.why')}
          working={false}
          showTimer={false}
          steps={[column.rationale]}
        />
      </td>
    </tr>
  );
}
