import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { RelativeTime } from '@/components/common/relative-time';
import { StatusBadge } from '@/components/common/status-badge';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

import { useManagementReport } from './api/attendance-queries';
import { EntityReport } from './components/entity-report';
import { usePeriods } from './hooks/use-periods';

/** Management reports (area 3): a month across both entities, read-only, each figure with its sources. */
export function ReportsPage() {
  const { t } = useTranslation('reports');
  const [params, setParams] = useSearchParams();
  const { periods, latest, label } = usePeriods();
  const period = periods.find((candidate) => candidate === params.get('period')) ?? latest;
  const report = useManagementReport(period);
  const missing = report.error instanceof ApiError && report.error.status === 404;
  const sample = report.data?.meta?.mock === true;
  // One scale for both entities, so their bars compare.
  const maxLeaveDays = Math.max(
    1,
    ...(report.data?.data.entities.flatMap((entity) => entity.leaveDays.map((item) => item.days)) ??
      []),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={
          <>
            <SyntheticDataBadge />
            {sample ? <MockBadge kind="data" /> : null}
            <StatusBadge tone="neutral">{t('readOnly')}</StatusBadge>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="report-period">{t('period')}</Label>
        <Select
          value={period}
          onValueChange={(value) => {
            setParams({ period: value }, { replace: true });
          }}
        >
          <SelectTrigger id="report-period" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {label(candidate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {report.data ? (
          <p className="text-sm text-muted-foreground">
            {t('generatedLabel')} <RelativeTime value={report.data.data.generatedAt} />
          </p>
        ) : null}
      </div>
      {report.status === 'pending' ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : missing ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : report.status === 'error' ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <FadeContent
          trigger="mount"
          className={cn('grid gap-6 lg:grid-cols-2', report.isFetching && 'opacity-60')}
        >
          {report.data.data.entities.map((month) => (
            <EntityReport key={month.entityCode} month={month} maxLeaveDays={maxLeaveDays} />
          ))}
        </FadeContent>
      )}
    </div>
  );
}
