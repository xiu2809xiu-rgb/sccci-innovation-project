import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MockBadge } from '@/components/common/mock-badge';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusMark } from '@/components/reactbits/status-mark';
import { bringsEmployeeData } from '@/features/connectors/connector-status';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';

import { CLUSTERS, type MapNode } from '../map-model';
import { NODE_STATE_STYLE } from '../node-state-style';

/**
 * Every system on the map, by region, with its state in words and an icon:
 * the keyboard and screen-reader route through the map (story A-6), and the
 * place a sighted user reads exact states.
 */
export function SystemList({ nodes }: { nodes: readonly MapNode[] }) {
  const { t } = useTranslation('integrationMap');

  return (
    <div className="space-y-5">
      {CLUSTERS.map((cluster) => {
        const members = nodes.filter((node) => node.cluster === cluster);
        if (members.length === 0) return null;
        return (
          <section key={cluster} aria-labelledby={`systems-${cluster}`} className="space-y-2">
            <h3 id={`systems-${cluster}`} className="text-sm font-semibold text-foreground">
              {t(`cluster.${cluster}`)}
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {members.map((node) => (
                <SystemRow key={node.id} node={node} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * One system: its name (the link to its connector) beside its state, then,
 * like the overview, its type and, if it brings employee data in, when it
 * last synced.
 */
function SystemRow({ node }: { node: MapNode }) {
  const { t, i18n } = useTranslation('integrationMap');
  const { t: tConnectors } = useTranslation('connectors');
  const format = useFormatters();
  const now = useNow();
  const { tone, icon: Icon } = NODE_STATE_STYLE[node.state];
  const { lastSyncAt, type, isMock } = node.connector;

  return (
    <li className="space-y-1 p-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/connectors/${encodeURIComponent(node.id)}`}
          className="min-w-0 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {i18n.language === 'zh-CN' ? node.connector.nameZh : node.connector.name}
        </Link>
        <StatusBadge
          tone={tone}
          className="shrink-0"
          icon={
            node.state === 'syncing' ? (
              // The badge's words name the state; the spinner only shows it moving.
              <span aria-hidden="true" className="inline-flex">
                <StatusMark status="running" statusText={t('state.syncing')} size={12} />
              </span>
            ) : (
              <Icon aria-hidden="true" />
            )
          }
        >
          {t(`state.${node.state}`)}
        </StatusBadge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">
          {tConnectors(`type.${type}`)}
          {bringsEmployeeData(type) ? (
            <>
              {' · '}
              {lastSyncAt ? (
                <time dateTime={lastSyncAt} title={format.dateTime(lastSyncAt)}>
                  {t('list.lastSync', { time: format.relativeTime(lastSyncAt, now) })}
                </time>
              ) : (
                t('list.neverSynced')
              )}
            </>
          ) : null}
        </p>
        {isMock ? <MockBadge kind="system" /> : null}
      </div>
    </li>
  );
}
