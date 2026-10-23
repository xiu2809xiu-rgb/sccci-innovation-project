import type { ConnectorDetail } from '@huitong/shared';
import { HeartPulse, KeyRound, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { RelativeTime } from '@/components/common/relative-time';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasPermission } from '@/app/session/use-session';

import { useConnector, useLiveConnectors } from '../api/connector-queries';
import { ImportFileCard } from '../components/import/import-file-card';
import { MappingVersions } from '../components/mapping-versions';
import { RunSyncDialog } from '../components/sync/run-sync-dialog';
import { SyncRunHistory } from '../components/sync-run-history';
import {
  bringsEmployeeData,
  CONNECTOR_STATUS_TONE,
  HEALTH_TONE,
  hasLiveEndpoint,
} from '../connector-status';
import { useCheckHealth } from '../hooks/use-check-health';

function Settings({ connector }: { connector: ConnectorDetail }) {
  const { t } = useTranslation('connectors');
  const entries = Object.entries(connector.config);
  return (
    <SectionCard title={t('detail.settings.title')} description={t('detail.settings.description')}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('detail.settings.endpoint')}</dt>
          <dd className="font-mono text-xs break-all">
            {connector.baseUrl ?? t('detail.settings.noEndpoint')}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('detail.settings.credentials')}</dt>
          <dd className="flex items-center gap-1.5">
            <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {connector.credentialsRef ? (
              <span>{t('detail.settings.credentialsRef', { ref: connector.credentialsRef })}</span>
            ) : (
              <span className="text-muted-foreground">{t('detail.settings.noCredentials')}</span>
            )}
          </dd>
        </div>
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs text-muted-foreground">{key}</dt>
            <dd className="font-mono text-xs">{String(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t('detail.settings.secretsNote')}</p>
    </SectionCard>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64 xl:col-span-2" />
    </div>
  );
}

/**
 * One connector: its settings, health, mapping versions and sync history, with
 * Sync now, and for a file connector the import of its staged file.
 */
export function ConnectorDetailPage({ connectorId }: { connectorId: string }) {
  const { t, i18n } = useTranslation('connectors');
  const connector = useConnector(connectorId);
  const health = useCheckHealth();
  const canSync = useHasPermission('employees:sync');
  const [syncOpen, setSyncOpen] = useState(false);
  useLiveConnectors();
  const data = connector.data;
  const name = data ? (i18n.language === 'zh-CN' ? data.nameZh : data.name) : connectorId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        {...(data ? { description: t(`type.${data.type}`) } : {})}
        meta={
          data ? (
            <>
              {data.isMock ? <MockBadge kind="system" /> : null}
              <StatusBadge tone={CONNECTOR_STATUS_TONE[data.status]}>
                {t(`status.${data.status}`)}
              </StatusBadge>
            </>
          ) : null
        }
        actions={
          data ? (
            <>
              {hasLiveEndpoint(data.type) ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={health.isChecking(connectorId)}
                  onClick={() => {
                    health.check(connectorId, name);
                  }}
                >
                  <HeartPulse aria-hidden="true" data-icon="inline-start" />
                  {t('card.checkNow')}
                </Button>
              ) : null}
              {canSync && data.syncable ? (
                <Button
                  type="button"
                  onClick={() => {
                    setSyncOpen(true);
                  }}
                >
                  <RefreshCw aria-hidden="true" data-icon="inline-start" />
                  {t('detail.syncNow')}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <QueryView query={connector} skeleton={<DetailSkeleton />}>
        {(detail) => (
          <FadeContent trigger="mount" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Settings connector={detail} />
              <SectionCard
                title={t('detail.health.title')}
                description={t('detail.health.description')}
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  {detail.lastHealthStatus ? (
                    <StatusBadge tone={HEALTH_TONE[detail.lastHealthStatus]}>
                      {t(`health.${detail.lastHealthStatus}`)}
                    </StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">{t('card.notChecked')}</span>
                  )}
                  {detail.lastHealthCheckAt ? (
                    <RelativeTime value={detail.lastHealthCheckAt} />
                  ) : null}
                </p>
              </SectionCard>
            </div>
            {bringsEmployeeData(detail.type) ? (
              <>
                {detail.type === 'FILE_IMPORT' ? <ImportFileCard connector={detail} /> : null}
                <MappingVersions configs={detail.mappingConfigs} />
                <section aria-label={t('detail.runs.caption')} className="space-y-3">
                  <h2 className="text-md font-semibold text-foreground">
                    {t('detail.runs.title')}
                  </h2>
                  <SyncRunHistory connectorId={connectorId} />
                </section>
              </>
            ) : null}
          </FadeContent>
        )}
      </QueryView>
      {canSync ? (
        <RunSyncDialog open={syncOpen} onOpenChange={setSyncOpen} connectorId={connectorId} />
      ) : null}
    </div>
  );
}
