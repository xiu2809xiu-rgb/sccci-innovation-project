import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';

import { useAccessMatrix, useClassifications } from '../api/governance-queries';
import { ClassificationTable } from '../components/classification-table';
import { GovernanceNav } from '../components/governance-nav';
import { usePageParam } from '../hooks/use-page-param';

const PAGE_SIZE = 50;

/** The data-classification register, read from the database (story F-3). */
export function ClassificationPage() {
  const { t } = useTranslation('governance');
  const [page, setPage] = usePageParam();
  const classifications = useClassifications(page, PAGE_SIZE);
  const matrix = useAccessMatrix();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('classification.title')}
        description={t('classification.description')}
        meta={<SyntheticDataBadge />}
      />
      <GovernanceNav />
      <FadeContent trigger="mount" className="space-y-3">
        <ClassificationTable
          query={classifications}
          matrix={matrix.isError ? null : matrix.data?.data}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
        <p className="text-xs text-muted-foreground">{t('classification.transferNote')}</p>
        <p className="text-xs text-muted-foreground">{t('classification.sensitiveNote')}</p>
      </FadeContent>
    </div>
  );
}
