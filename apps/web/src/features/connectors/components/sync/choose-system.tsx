import type { ConnectorSummary } from '@huitong/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/common/error-state';
import { RelativeTime } from '@/components/common/relative-time';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

/** Picks the HR system to sync; only connectors that can pull employees are offered. */
export function ChooseSystem({
  connectors,
  value,
  onChange,
  locked,
}: {
  connectors: UseQueryResult<ConnectorSummary[]>;
  value: string;
  onChange: (connectorId: string) => void;
  locked: boolean;
}) {
  const { t, i18n } = useTranslation('connectors');
  const baseId = useId();

  if (connectors.status === 'pending') {
    return (
      <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (connectors.status === 'error') {
    return (
      <ErrorState
        error={connectors.error}
        onRetry={() => {
          void connectors.refetch();
        }}
      />
    );
  }

  const syncable = connectors.data.filter((connector) => connector.syncable);
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      aria-label={t('sync.choose')}
      className="grid gap-2 sm:grid-cols-2"
    >
      {syncable.map((connector) => {
        const id = `${baseId}-${connector.id}`;
        return (
          <div
            key={connector.id}
            className="flex items-start gap-3 rounded-md border border-border p-3 has-data-checked:border-primary has-data-checked:bg-primary-subtle/40"
          >
            <RadioGroupItem
              id={id}
              value={connector.id}
              disabled={locked && connector.id !== value}
              className="mt-0.5"
            />
            <Label htmlFor={id} className="flex flex-col items-start gap-1 font-normal">
              <span className="font-medium text-foreground">
                {i18n.language === 'zh-CN' ? connector.nameZh : connector.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {connector.lastSyncAt ? (
                  <>
                    {t('sync.lastSync')} <RelativeTime value={connector.lastSyncAt} />
                  </>
                ) : (
                  t('sync.neverSynced')
                )}
              </span>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
