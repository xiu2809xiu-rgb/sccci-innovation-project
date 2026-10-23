import { STAGED_IMPORT_TTL_MINUTES, type StagedImport } from '@huitong/shared';
import { FileSpreadsheet, ShieldOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { RelativeTime } from '@/components/common/relative-time';
import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';

export interface StagedImportSummaryProps {
  staged: StagedImport;
  /** A newer mapping version is active, so the file has to be staged again. */
  stale: boolean;
  /** Absent when the viewer may not discard it. */
  onDiscard?: () => void;
  discarding: boolean;
}

type DroppedReason = StagedImport['droppedColumns'][number]['reason'];

function headersDropped(staged: StagedImport, reason: DroppedReason): string[] {
  return staged.droppedColumns
    .filter((column) => column.reason === reason)
    .map((column) => `“${column.header}”`);
}

/**
 * The staged file as HR checks it before the preview: what is kept, what was
 * left out and why, and when it is deleted. It shows no cell values.
 */
export function StagedImportSummary({
  staged,
  stale,
  onDiscard,
  discarding,
}: StagedImportSummaryProps) {
  const { t } = useTranslation('connectors');
  const format = useFormatters();
  const prohibited = headersDropped(staged, 'PROHIBITED');
  const notMapped = headersDropped(staged, 'NOT_MAPPED');
  const unlisted = staged.rejectedCount - staged.rejectedRows.length;

  return (
    <section aria-label={t('detail.import.summary.label')} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden="true" />
        {staged.fileName}
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">{t('detail.import.summary.rows')}</dt>
          <dd className="tabular-nums">{format.number(staged.rowCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('detail.import.summary.version')}</dt>
          <dd className="tabular-nums">
            {t('detail.import.summary.versionValue', { version: staged.mappingVersion })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('detail.import.summary.expires')}</dt>
          <dd>
            <RelativeTime value={staged.expiresAt} />
          </dd>
        </div>
      </dl>
      {stale ? (
        <p className="rounded-md border border-warning-border bg-warning-subtle p-3 text-sm text-foreground">
          {t('detail.import.summary.stale', { version: staged.mappingVersion })}
        </p>
      ) : null}
      {staged.rejectedCount > 0 ? (
        <div className="space-y-1 rounded-md border border-warning-border bg-warning-subtle p-3 text-sm">
          <p className="font-medium text-foreground">
            {t('detail.import.rejected', { count: staged.rejectedCount })}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {staged.rejectedRows.map((row) => (
              <li key={row.line}>
                {t(`detail.import.rejectedReason.${row.reason}`, { line: row.line })}
              </li>
            ))}
          </ul>
          {unlisted > 0 ? (
            <p className="text-muted-foreground">
              {t('detail.import.rejectedMore', { count: unlisted })}
            </p>
          ) : null}
        </div>
      ) : null}
      {prohibited.length > 0 ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          {t('detail.import.prohibited', { columns: format.list(prohibited) })}
        </p>
      ) : null}
      {notMapped.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('detail.import.notMapped', { columns: format.list(notMapped) })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t('detail.import.summary.expiresHint', { minutes: STAGED_IMPORT_TTL_MINUTES })}
      </p>
      {onDiscard ? (
        <Button type="button" variant="ghost" size="sm" disabled={discarding} onClick={onDiscard}>
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          {t('detail.import.discard')}
        </Button>
      ) : null}
    </section>
  );
}
