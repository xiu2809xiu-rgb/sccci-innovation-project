import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ErrorState } from '@/components/common/error-state';
import { RelativeTime } from '@/components/common/relative-time';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useMappingProposals } from '../api/mapping-proposals';

/** AI mapping proposals that nobody has approved or rejected yet; nothing is used until someone does. */
export function PendingProposals() {
  const { t } = useTranslation('connectors');
  const proposals = useMappingProposals('PENDING_REVIEW');

  return (
    <SectionCard title={t('proposals.title')} description={t('proposals.description')}>
      {proposals.status === 'pending' ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : null}
      {proposals.status === 'error' ? (
        <ErrorState
          error={proposals.error}
          onRetry={() => {
            void proposals.refetch();
          }}
        />
      ) : null}
      {proposals.data?.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('proposals.empty')}</p>
      ) : null}
      {proposals.data && proposals.data.data.length > 0 ? (
        <ul className="divide-y divide-border">
          {proposals.data.data.map((proposal) => {
            const review = proposal.columns.filter((column) => column.flags.length > 0).length;
            return (
              <li
                key={proposal.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {proposal.sourceSystemName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {proposal.fileName} · {proposal.createdBy.displayName} ·{' '}
                    <RelativeTime value={proposal.createdAt} />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone="info" icon={<Sparkles aria-hidden="true" />}>
                    {t('proposals.requiresApproval')}
                  </StatusBadge>
                  {review > 0 ? (
                    <StatusBadge tone="warning">
                      {t('proposals.needReview', { count: review })}
                    </StatusBadge>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/connectors/new-mapping?proposal=${proposal.id}`}>
                      {t('proposals.review')}
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}
