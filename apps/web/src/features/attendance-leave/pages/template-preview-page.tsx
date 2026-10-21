import { Download, TableProperties } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { DataTablePagination } from '@/components/common/data-table/data-table-pagination';
import { EmptyState } from '@/components/common/empty-state';
import { MockBadge } from '@/components/common/mock-badge';
import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { UnavailableButton } from '@/components/common/unavailable-button';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useTemplatePreview } from '../api/attendance-queries';
import { AreaNav } from '../components/area-nav';
import { PreviewTable } from '../components/preview-table';
import { usePeriods } from '../hooks/use-periods';

const PAGE_SIZE = 50;

/** A month in the company's template before anything is exported (preview before export). */
export function TemplatePreviewPage() {
  const { t } = useTranslation('attendanceLeave');
  const { t: tCommon } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { periods, latest, label } = usePeriods();
  const period = periods.find((candidate) => candidate === params.get('period')) ?? latest;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const preview = useTemplatePreview(period, page, PAGE_SIZE);
  const sample = preview.data?.meta?.mock === true;

  const update = (changes: Record<'period' | 'page', string | null>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('template.title')}
        description={t('template.description')}
        meta={
          <>
            <SyntheticDataBadge />
            {sample ? <MockBadge kind="data" /> : null}
          </>
        }
        actions={
          sample ? (
            <UnavailableButton
              label={t('template.export')}
              reason={t('template.exportSample')}
              icon={Download}
            />
          ) : null
        }
      />
      <AreaNav />
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="preview-period">{t('template.period')}</Label>
        <Select
          value={period}
          onValueChange={(value) => {
            update({ period: value, page: null });
          }}
        >
          <SelectTrigger id="preview-period" className="w-48">
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
      </div>
      <FadeContent trigger="mount">
        <QueryView
          query={preview}
          skeleton={<Skeleton className="h-96" />}
          isEmpty={({ data }) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={TableProperties}
              title={t('template.empty.title')}
              description={t('template.empty.description')}
              action={
                <Button asChild variant="outline">
                  <Link to="/attendance-leave">{t('template.empty.action')}</Link>
                </Button>
              }
            />
          }
        >
          {({ data }) => (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('template.entityNote', { entity: tCommon(`entities.${data.entityCode}`) })}
              </p>
              <div className="rounded-lg border border-border">
                <PreviewTable preview={data} periodLabel={label(period)} />
                <DataTablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.total}
                  onPageChange={(next) => {
                    update({ period: params.get('period'), page: String(next) });
                  }}
                />
              </div>
            </div>
          )}
        </QueryView>
      </FadeContent>
    </div>
  );
}
