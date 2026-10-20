import { Sparkles, Unplug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasPermission } from '@/app/session/use-session';

import { useConnectors, useLiveConnectors } from '../api/connector-queries';
import { ConnectorCard } from '../components/connector-card';
import { PendingProposals } from '../components/pending-proposals';
import { inListOrder } from '../connector-status';

function ListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-56" />
      ))}
    </div>
  );
}

/** Every connected system, its health and mapping version, and the AI mapping proposals awaiting review. */
export function ConnectorListPage() {
  const { t } = useTranslation('connectors');
  const connectors = useConnectors();
  const canPropose = useHasPermission('mappings:propose');
  useLiveConnectors();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={<SyntheticDataBadge />}
        actions={
          canPropose ? (
            <Button asChild>
              <Link to="/connectors/new-mapping">
                <Sparkles aria-hidden="true" data-icon="inline-start" />
                {t('actions.newMapping')}
              </Link>
            </Button>
          ) : null
        }
      />
      <FadeContent trigger="mount" className="space-y-6">
        <QueryView
          query={connectors}
          skeleton={<ListSkeleton />}
          isEmpty={(data) => data.length === 0}
          empty={
            <EmptyState
              icon={Unplug}
              title={t('empty.title')}
              description={t('empty.description')}
            />
          }
        >
          {(data) => (
            <section aria-label={t('list.label')}>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {inListOrder(data).map((connector) => (
                  <li key={connector.id}>
                    <ConnectorCard connector={connector} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </QueryView>
        {canPropose ? <PendingProposals /> : null}
      </FadeContent>
    </div>
  );
}
