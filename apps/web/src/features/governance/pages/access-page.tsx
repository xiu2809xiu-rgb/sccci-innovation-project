import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/common/page-header';
import { QueryView } from '@/components/common/query-view';
import { SectionCard } from '@/components/common/section-card';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Skeleton } from '@/components/ui/skeleton';

import { useAccessMatrix } from '../api/governance-queries';
import { ClearanceTable } from '../components/clearance-table';
import { GovernanceNav } from '../components/governance-nav';
import { PermissionMatrix } from '../components/permission-matrix';

/** The access policy the API enforces right now: permissions by role, and clearance by entity. */
export function AccessPage() {
  const { t } = useTranslation('governance');
  const matrix = useAccessMatrix();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('access.title')}
        description={t('access.description')}
        meta={<SyntheticDataBadge />}
      />
      <GovernanceNav />
      <QueryView query={matrix} skeleton={<Skeleton className="h-96" />}>
        {({ data }) => (
          <FadeContent trigger="mount" className="grid gap-6 2xl:grid-cols-12">
            <SectionCard
              title={t('access.permissions')}
              description={t('access.adminNote')}
              className="min-w-0 2xl:col-span-7"
            >
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Scale className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t('access.separation')}
                </p>
                <PermissionMatrix matrix={data} />
              </div>
            </SectionCard>
            <SectionCard
              title={t('access.clearance')}
              description={t('access.clearanceDescription')}
              className="min-w-0 2xl:col-span-5"
            >
              <ClearanceTable matrix={data} />
            </SectionCard>
          </FadeContent>
        )}
      </QueryView>
    </div>
  );
}
