import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';

import { useRetention } from '../api/governance-queries';
import { GovernanceNav } from '../components/governance-nav';
import { RetentionTable } from '../components/retention-table';
import { usePageParam } from '../hooks/use-page-param';

const PAGE_SIZE = 50;

/** The retention settings, read from the database (story F-5). */
export function RetentionPage() {
  const { t } = useTranslation('governance');
  const [page, setPage] = usePageParam();
  const retention = useRetention(page, PAGE_SIZE);
  // True only while no rule has run, so the note cannot outlive the purge.
  const neverApplied = retention.data?.data.every((rule) => rule.lastAppliedAt === null) === true;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('retention.title')}
        description={t('retention.description')}
        meta={<SyntheticDataBadge />}
      />
      <GovernanceNav />
      <FadeContent trigger="mount" className="space-y-3">
        {neverApplied ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('retention.purgeNote')}
          </p>
        ) : null}
        <RetentionTable query={retention} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </FadeContent>
    </div>
  );
}
