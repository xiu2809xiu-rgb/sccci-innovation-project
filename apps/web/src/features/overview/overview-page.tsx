import { LIVE_CONNECTOR_STATUSES, type Overview } from '@huitong/shared';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/app/session/use-session';
import { useFormatters } from '@/hooks/use-formatters';
import { useNow } from '@/hooks/use-now';

import { useOverview } from './api/use-overview';
import { ActivityPanel } from './components/activity-panel';
import { FirstRunCallout } from './components/first-run-callout';
import { KpiStrip } from './components/kpi-strip';
import { OpenConflictsPanel } from './components/open-conflicts-panel';
import { OverviewSkeleton } from './components/overview-skeleton';
import { PendingApprovalsPanel } from './components/pending-approvals-panel';
import { SyncHealthPanel } from './components/sync-health-panel';

/** Live connectors that are not ACTIVE, or whose latest run failed: their figures may be stale. */
function unhealthyCount(overview: Overview): number {
  return overview.connectors.filter(
    (connector) =>
      LIVE_CONNECTOR_STATUSES.includes(connector.status) &&
      (connector.status !== 'ACTIVE' || connector.recentRuns[0]?.status === 'FAILED'),
  ).length;
}

function OverviewContent({ overview }: { overview: Overview }) {
  const { t } = useTranslation('overview');
  const canReviewConflicts = useHasPermission('employees:read');
  const canOpenConnectors = useHasPermission('connectors:read');
  const unhealthy = unhealthyCount(overview);

  return (
    <FadeContent trigger="mount" className="space-y-6">
      {overview.kpis.employees.total === 0 ? (
        <FirstRunCallout canOpenConnectors={canOpenConnectors} />
      ) : null}
      {unhealthy > 0 ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-sm text-warning"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {t('partial', { count: unhealthy })}
        </p>
      ) : null}
      <KpiStrip kpis={overview.kpis} canReviewConflicts={canReviewConflicts} />
      <div className="grid gap-6 xl:grid-cols-12">
        <SyncHealthPanel connectors={overview.connectors} className="xl:col-span-8" />
        <PendingApprovalsPanel approvals={overview.pendingApprovals} className="xl:col-span-4" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <OpenConflictsPanel conflicts={overview.recentConflicts} canReview={canReviewConflicts} />
        <ActivityPanel activity={overview.activity} />
      </div>
    </FadeContent>
  );
}

/** The HR home page: is everything in sync, what needs me, and what changed. */
export function OverviewPage() {
  const { t } = useTranslation('overview');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const now = useNow();
  const query = useOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {query.data ? (
              <span
                className="text-xs text-muted-foreground"
                title={format.dateTime(query.data.generatedAt)}
              >
                {tCommon('states.updated', {
                  time: format.relativeTime(query.data.generatedAt, now),
                })}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              <RotateCw aria-hidden="true" data-icon="inline-start" />
              {tCommon('actions.refresh')}
            </Button>
          </>
        }
      />
      <QueryView query={query} skeleton={<OverviewSkeleton />}>
        {(overview) => <OverviewContent overview={overview} />}
      </QueryView>
    </div>
  );
}
