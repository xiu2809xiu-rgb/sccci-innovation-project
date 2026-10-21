import type { TransferEntry, TransferStatus } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { useFieldLabel } from '../hooks/use-field-label';
import { ChipList } from './chip-list';

/**
 * What a status change does to the data crossing the border, before it is
 * made (error prevention): only ACTIVE entries share, so approving starts
 * sending the entry's fields and any other status stops them at once.
 */
export function TransferChangePreview({
  entry,
  next,
}: {
  entry: TransferEntry;
  next: TransferStatus;
}) {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const fieldLabel = useFieldLabel();
  const to = tCommon(`entities.${entry.toEntityCode}`);
  const starts = next === 'ACTIVE' && entry.status !== 'ACTIVE';
  const stops = entry.status === 'ACTIVE' && next !== 'ACTIVE';

  if (!starts && !stops) {
    return <p className="text-sm text-muted-foreground">{t('changeDialog.sharesNothing')}</p>;
  }
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">
        {starts ? t('changeDialog.willShare', { to }) : t('changeDialog.willWithhold', { to })}
      </p>
      {entry.fieldsCovered.length > 0 ? (
        <ChipList items={entry.fieldsCovered.map(fieldLabel)} />
      ) : (
        <p className="text-sm text-muted-foreground">{t('transfers.noFields')}</p>
      )}
      {starts ? (
        <p className="text-xs text-muted-foreground">
          {t('changeDialog.legalBasis', { basis: entry.legalBasis })}
        </p>
      ) : null}
    </div>
  );
}
