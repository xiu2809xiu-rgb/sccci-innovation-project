import type { Conflict } from '@huitong/shared';
import { CheckCircle2, GitCompareArrows } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { RelativeTime } from '@/components/common/relative-time';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';

import { useEmployeeLabels } from '../hooks/use-employee-labels';
import { FieldValue } from './field-value';

/** One conflict: what each system said, and how HR settled it once it is resolved. */
export function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: Conflict;
  onResolve?: (conflict: Conflict) => void;
}) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const open = conflict.status === 'OPEN';

  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{labels.field(conflict.field)}</h3>
        <StatusBadge
          tone={open ? 'warning' : 'success'}
          icon={
            open ? <GitCompareArrows aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />
          }
        >
          {t(`conflicts.status.${conflict.status}`)}
        </StatusBadge>
      </header>
      <dl className="grid gap-2 sm:grid-cols-2">
        {conflict.candidates.map((candidate) => (
          <div
            key={candidate.connectorId}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <dt className="text-xs text-muted-foreground">
              {labels.source(candidate.connectorId)}
              {' · '}
              <RelativeTime value={candidate.observedAt} />
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              <FieldValue field={conflict.field} value={candidate.value} />
            </dd>
          </div>
        ))}
      </dl>
      {open ? (
        <footer className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t('conflicts.detected')} <RelativeTime value={conflict.detectedAt} />
          </p>
          {onResolve ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onResolve(conflict);
              }}
            >
              {t('actions.resolve')}
            </Button>
          ) : null}
        </footer>
      ) : (
        <footer className="space-y-1 text-xs text-muted-foreground">
          <p>
            {conflict.resolution === 'SOURCE_SELECTED' && conflict.chosenConnectorId
              ? t('conflicts.resolution.SOURCE_SELECTED', {
                  source: labels.source(conflict.chosenConnectorId),
                })
              : t('conflicts.resolution.MANUAL_VALUE')}
            {conflict.resolvedBy ? ` · ${conflict.resolvedBy.displayName}` : null}
            {conflict.resolvedAt ? (
              <>
                {' · '}
                <RelativeTime value={conflict.resolvedAt} />
              </>
            ) : null}
          </p>
          {conflict.resolutionNote ? <p className="italic">“{conflict.resolutionNote}”</p> : null}
        </footer>
      )}
    </article>
  );
}
