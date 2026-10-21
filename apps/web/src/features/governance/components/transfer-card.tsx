import { TRANSFER_CATEGORIES, type TransferEntry } from '@huitong/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';

import { useFieldLabel } from '../hooks/use-field-label';
import { TRANSFER_STATUS_STYLE } from '../transfer-status';
import { ChipList } from './chip-list';

const isCategory = (entry: string): entry is keyof typeof TRANSFER_CATEGORIES =>
  Object.hasOwn(TRANSFER_CATEGORIES, entry);

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * One register entry: where personal data goes, on what basis, whether it is
 * approved, and exactly which fields reach the destination while it is active.
 */
export function TransferCard({
  entry,
  onChange,
}: {
  entry: TransferEntry;
  /** Absent for roles that may not administer the register. */
  onChange?: (entry: TransferEntry) => void;
}) {
  const { t, i18n } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const fieldLabel = useFieldLabel();
  const now = useNow();
  const name = i18n.language === 'zh-CN' && entry.nameZh ? entry.nameZh : entry.name;
  const { tone, icon: Icon } = TRANSFER_STATUS_STYLE[entry.status];
  const overdue = entry.reviewDueAt !== null && new Date(entry.reviewDueAt) < now;

  return (
    <SectionCard
      title={name}
      description={t('transfers.route', {
        from: tCommon(`entities.${entry.fromEntityCode}`),
        to: tCommon(`entities.${entry.toEntityCode}`),
      })}
      action={
        onChange ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t('transfers.changeLabel', { name })}
            onClick={() => {
              onChange(entry);
            }}
          >
            {t('transfers.change')}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tone} icon={<Icon aria-hidden="true" />}>
            {t(`transfers.status.${entry.status}`)}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            {t('transfers.version', { version: entry.version })}
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label={t('transfers.purpose')}>{entry.purpose}</Detail>
          <Detail label={t('transfers.legalBasis')}>{entry.legalBasis}</Detail>
          <Detail label={t('transfers.mechanism')}>{entry.mechanism}</Detail>
          <Detail label={t('transfers.approvedAt')}>
            {entry.approvedAt ? format.date(entry.approvedAt) : t('transfers.notApproved')}
          </Detail>
          <Detail label={t('transfers.reviewDueAt')}>
            {entry.reviewDueAt ? (
              <span className="inline-flex items-center gap-2">
                {format.date(entry.reviewDueAt)}
                {overdue ? <StatusBadge tone="danger">{t('transfers.overdue')}</StatusBadge> : null}
              </span>
            ) : (
              t('transfers.noReview')
            )}
          </Detail>
          {entry.notes ? <Detail label={t('transfers.notes')}>{entry.notes}</Detail> : null}
        </dl>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">{t('transfers.categories')}</h3>
          <ChipList
            items={entry.dataCategories.map((category) =>
              isCategory(category) ? t(`transfers.category.${category}`) : fieldLabel(category),
            )}
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            {entry.status === 'ACTIVE'
              ? t('transfers.fieldsShared')
              : t('transfers.fieldsWhenActive')}
          </h3>
          {entry.fieldsCovered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('transfers.noFields')}</p>
          ) : (
            <ChipList items={entry.fieldsCovered.map(fieldLabel)} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}
