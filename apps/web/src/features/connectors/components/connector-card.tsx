import type { ConnectorSummary } from '@huitong/shared';
import { ArrowRight, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { RelativeTime } from '@/components/common/relative-time';
import { StatusBadge } from '@/components/common/status-badge';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import { StatusMark } from '@/components/reactbits/status-mark';
import { Button } from '@/components/ui/button';

import {
  bringsEmployeeData,
  CONNECTOR_STATUS_TONE,
  hasLiveEndpoint,
  HEALTH_TONE,
  RUN_STATUS_TONE,
} from '../connector-status';
import { useCheckHealth } from '../hooks/use-check-health';

/** One connected system at a glance: status, health, last sync and the mapping version in use. */
export function ConnectorCard({ connector }: { connector: ConnectorSummary }) {
  const { t, i18n } = useTranslation('connectors');
  const health = useCheckHealth();
  const name = i18n.language === 'zh-CN' ? connector.nameZh : connector.name;
  const checking = health.isChecking(connector.id);

  return (
    <SpotlightCard className="flex h-full flex-col gap-4 p-5" intensity={0.1} proximity={40}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The full name stays reachable on hover when the card truncates it. */}
          <h3 className="truncate text-base font-semibold text-foreground" title={name}>
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t(`type.${connector.type}`)}
            {connector.entityCode ? ` · ${connector.entityCode}` : ''}
          </p>
        </div>
        <StatusBadge tone={CONNECTOR_STATUS_TONE[connector.status]}>
          {t(`status.${connector.status}`)}
        </StatusBadge>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('card.health')}</dt>
          <dd className="flex items-center gap-2">
            {checking ? (
              <StatusMark status="running" statusText={t('card.checking')} size={14} />
            ) : connector.lastHealthStatus ? (
              <StatusBadge tone={HEALTH_TONE[connector.lastHealthStatus]}>
                {t(`health.${connector.lastHealthStatus}`)}
              </StatusBadge>
            ) : (
              <span className="text-subtle-foreground">{t('card.notChecked')}</span>
            )}
            {connector.lastHealthCheckAt && !checking ? (
              <RelativeTime
                value={connector.lastHealthCheckAt}
                className="text-xs text-muted-foreground"
              />
            ) : null}
          </dd>
        </div>
        {bringsEmployeeData(connector.type) ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">{t('card.lastSync')}</dt>
              <dd className="flex items-center gap-2">
                {connector.latestRun ? (
                  <StatusBadge tone={RUN_STATUS_TONE[connector.latestRun.status]}>
                    {t(`runStatus.${connector.latestRun.status}`)}
                  </StatusBadge>
                ) : null}
                {connector.lastSyncAt ? (
                  <RelativeTime
                    value={connector.lastSyncAt}
                    className="text-xs text-muted-foreground"
                  />
                ) : (
                  <span className="text-subtle-foreground">{t('card.neverSynced')}</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">{t('card.mapping')}</dt>
              <dd>
                {connector.activeMappingVersion !== null
                  ? t('card.mappingVersion', { version: connector.activeMappingVersion })
                  : t('card.noMapping')}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {hasLiveEndpoint(connector.type) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={checking}
            onClick={() => {
              health.check(connector.id, name);
            }}
          >
            <HeartPulse aria-hidden="true" data-icon="inline-start" />
            {t('card.checkNow')}
          </Button>
        ) : (
          <span />
        )}
        <Button asChild variant="outline" size="sm">
          <Link to={`/connectors/${connector.id}`}>
            {t('card.details')}
            {/* "Details" stays first in the accessible name (WCAG 2.5.3); the system's name follows. */}
            <span className="sr-only">{t('card.detailsOf', { name })}</span>
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </SpotlightCard>
  );
}
