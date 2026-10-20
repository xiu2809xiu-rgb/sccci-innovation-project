import type { ConnectorHealth } from '@huitong/shared';
import { Unplug } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusMark } from '@/components/reactbits/status-mark';
import { CONNECTOR_STATUS_TONE } from '@/features/connectors/connector-status';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';

import { RunHistoryStrip } from './run-history-strip';

function ConnectorRow({ connector }: { connector: ConnectorHealth }) {
  const { t, i18n } = useTranslation('overview');
  const { t: tConnectors } = useTranslation('connectors');
  const format = useFormatters();
  const now = useNow();
  const name = i18n.language === 'zh-CN' ? connector.nameZh : connector.name;
  const latest = connector.recentRuns[0];
  const running = latest?.status === 'RUNNING' || latest?.status === 'QUEUED';
  const lastSync = connector.lastSyncAt
    ? t('syncHealth.lastSync', { time: format.relativeTime(connector.lastSyncAt, now) })
    : t('syncHealth.neverSynced');

  return (
    <li className="grid gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_8.5rem] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={connector.lastSyncAt ? format.dateTime(connector.lastSyncAt) : undefined}
        >
          {tConnectors(`type.${connector.type}`)} · {lastSync}
        </p>
      </div>
      <RunHistoryStrip runs={connector.recentRuns} label={t('syncHealth.runs', { name })} />
      <div className="flex items-center gap-2 sm:justify-end">
        {running ? (
          <StatusMark status="running" statusText={t('syncHealth.running')} size={16} />
        ) : null}
        <StatusBadge tone={CONNECTOR_STATUS_TONE[connector.status]}>
          {tConnectors(`status.${connector.status}`)}
        </StatusBadge>
      </div>
    </li>
  );
}

/** Each connected system with its status and recent runs. */
export function SyncHealthPanel({
  connectors,
  className,
}: {
  connectors: ConnectorHealth[];
  className?: string;
}) {
  const { t } = useTranslation('overview');
  return (
    <SectionCard
      title={t('syncHealth.title')}
      description={t('syncHealth.description')}
      className={className}
    >
      {connectors.length === 0 ? (
        <EmptyState icon={Unplug} title={t('syncHealth.empty')} />
      ) : (
        <ul className="divide-y divide-border">
          {connectors.map((connector) => (
            <ConnectorRow key={connector.id} connector={connector} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
