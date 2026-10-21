import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-error';

import { useWorkflowInstance } from '../api/workflow-queries';
import { ApprovalChain } from '../components/approval-chain';
import { InstanceHistory } from '../components/instance-history';
import { InstanceSteps } from '../components/instance-steps';
import { RequestSummary } from '../components/request-summary';
import { SlaBadge } from '../components/sla-badge';
import { INSTANCE_STATUS_TONE } from '../workflow-status';

function BackToBoard() {
  const { t } = useTranslation('workflows');
  return (
    <Button asChild variant="outline">
      <Link to="/workflows">
        <ArrowLeft aria-hidden="true" data-icon="inline-start" />
        {t('actions.backToBoard')}
      </Link>
    </Button>
  );
}

function InstanceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Skeleton className="h-96 lg:col-span-8" />
      <Skeleton className="h-96 lg:col-span-4" />
    </div>
  );
}

/** One request's workflow: its steps, the OA approval behind it, the employee record and the history. */
export function WorkflowInstancePage({ instanceId }: { instanceId: string }) {
  const { t, i18n } = useTranslation('workflows');
  const { t: tCommon } = useTranslation();
  const query = useWorkflowInstance(instanceId);

  if (query.status === 'pending') {
    return (
      <div aria-busy="true" className="space-y-6">
        <Skeleton className="h-16" />
        <InstanceSkeleton />
        <span className="sr-only" role="status">
          {tCommon('states.loading')}
        </span>
      </div>
    );
  }
  if (query.status === 'error') {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} actions={<BackToBoard />} />
        {missing ? (
          <EmptyState
            icon={SearchX}
            title={tCommon('states.notFound.title')}
            description={tCommon('states.notFound.description')}
            action={<BackToBoard />}
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }

  const { data: instance, meta } = query.data;
  const definitionName =
    i18n.language === 'zh-CN' ? instance.definition.nameZh : instance.definition.name;
  return (
    <div className="space-y-6">
      <PageHeader
        title={instance.title}
        description={definitionName}
        meta={
          <>
            <SyntheticDataBadge />
            {meta?.mock ? <MockBadge kind="data" /> : null}
            <StatusBadge tone={INSTANCE_STATUS_TONE[instance.status]}>
              {t(`status.${instance.status}`)}
            </StatusBadge>
            <SlaBadge sla={instance.sla} />
          </>
        }
        actions={<BackToBoard />}
      />
      <FadeContent trigger="mount" className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <InstanceSteps steps={instance.steps} />
          <InstanceHistory timeline={instance.timeline} steps={instance.steps} />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <RequestSummary instance={instance} />
          <ApprovalChain decisions={instance.approvalChain} />
        </div>
      </FadeContent>
    </div>
  );
}
