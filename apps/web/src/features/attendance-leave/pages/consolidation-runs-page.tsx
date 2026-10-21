import { Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { ErrorState } from '@/components/common/error-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { UnavailableButton } from '@/components/common/unavailable-button';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasPermission } from '@/app/session/use-session';

import { useConsolidationRun, useConsolidationRuns } from '../api/attendance-queries';
import { AreaNav } from '../components/area-nav';
import { RunDetail } from '../components/run-detail';
import { RunsTable } from '../components/runs-table';
import { StartRunDialog } from '../components/start-run-dialog';

const PAGE_SIZE = 25;

/** Every month's consolidation, and the one selected: its sources and the exceptions to settle. */
export function ConsolidationRunsPage() {
  const { t } = useTranslation('attendanceLeave');
  const [params, setParams] = useSearchParams();
  const [starting, setStarting] = useState(false);
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const runs = useConsolidationRuns(page, PAGE_SIZE);
  const sample = runs.data?.meta.mock === true;
  // The newest run is open unless the person chose another.
  const runId = params.get('run') ?? runs.data?.data[0]?.id ?? null;
  const run = useConsolidationRun(runId);
  const canConsolidate = useHasPermission('attendance:consolidate');

  // Shown once the runs are in, so the action never changes under the pointer.
  const startAction =
    !canConsolidate || !runs.data ? null : sample ? (
      <UnavailableButton
        label={t('runs.start')}
        reason={t('runs.startSample')}
        icon={Play}
        variant="default"
      />
    ) : (
      <Button
        type="button"
        onClick={() => {
          setStarting(true);
        }}
      >
        <Play aria-hidden="true" data-icon="inline-start" />
        {t('runs.start')}
      </Button>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('runs.description')}
        meta={
          <>
            <SyntheticDataBadge />
            {sample ? <MockBadge kind="data" /> : null}
          </>
        }
        actions={startAction}
      />
      <AreaNav />
      <FadeContent trigger="mount" className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <RunsTable
            query={runs}
            page={page}
            pageSize={PAGE_SIZE}
            selectedId={runId}
            onPageChange={(next) => {
              setParams((current) => {
                const updated = new URLSearchParams(current);
                updated.set('page', String(next));
                return updated;
              });
            }}
          />
        </div>
        <div className="min-w-0 xl:col-span-5">
          {runId === null ? (
            <SectionCard title={t('run.exceptions')}>
              <p className="text-sm text-muted-foreground">{t('run.choose')}</p>
            </SectionCard>
          ) : run.status === 'pending' ? (
            <Skeleton className="h-80" />
          ) : run.status === 'error' ? (
            <ErrorState error={run.error} onRetry={() => void run.refetch()} />
          ) : (
            <RunDetail run={run.data.data} sample={run.data.meta?.mock === true} />
          )}
        </div>
      </FadeContent>
      {starting ? <StartRunDialog open={starting} onOpenChange={setStarting} /> : null}
    </div>
  );
}
