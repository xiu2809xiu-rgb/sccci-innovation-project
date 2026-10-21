import { Lock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';

import { useAuditEvents } from '../api/governance-queries';
import {
  hasAuditFilters,
  readAuditFilters,
  toApiFilters,
  writeAuditFilters,
  type AuditFilterValues,
} from '../audit-filter-params';
import { AuditFilters } from '../components/audit-filters';
import { AuditTable } from '../components/audit-table';
import { ChainCheck } from '../components/chain-check';
import { GovernanceNav } from '../components/governance-nav';
import { usePageParam } from '../hooks/use-page-param';

const PAGE_SIZE = 25;

const NO_FILTERS: AuditFilterValues = {
  entityType: '',
  entityId: '',
  actorUserId: '',
  action: '',
  from: '',
  to: '',
};

/** The append-only audit log, read only, with its integrity check (story F-2). */
export function AuditLogPage() {
  const { t } = useTranslation('governance');
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const filters = readAuditFilters(params);
  const events = useAuditEvents(toApiFilters(filters), page, PAGE_SIZE);
  const filtered = hasAuditFilters(filters);

  const apply = (values: AuditFilterValues) => {
    setParams((current) => writeAuditFilters(current, values));
  };
  const personName =
    events.data?.data.find((event) => event.actorUserId === filters.actorUserId)?.actorName ??
    t('audit.filters.selectedPerson');
  const clear = filtered ? (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        apply(NO_FILTERS);
      }}
    >
      {t('audit.filters.clear')}
    </Button>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        meta={
          <>
            <SyntheticDataBadge />
            <StatusBadge tone="neutral" icon={<Lock aria-hidden="true" />}>
              {t('audit.readOnly')}
            </StatusBadge>
          </>
        }
      />
      <GovernanceNav />
      <FadeContent trigger="mount" className="space-y-6">
        <ChainCheck />
        <div className="space-y-3">
          <AuditFilters key={params.toString()} values={filters} onApply={apply} />
          {filtered ? (
            <div className="flex flex-wrap items-center gap-2">
              {filters.actorUserId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    apply({ ...filters, actorUserId: '' });
                  }}
                >
                  {t('audit.filters.person', { name: personName })}
                  <X aria-hidden="true" data-icon="inline-end" />
                  {/* The visible label stays the start of the name (WCAG 2.5.3); this says what pressing does. */}{' '}
                  <span className="sr-only">{t('audit.filters.removeFilter')}</span>
                </Button>
              ) : null}
              {clear}
            </div>
          ) : null}
        </div>
        <AuditTable
          query={events}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onPerson={(actorUserId) => {
            apply({ ...filters, actorUserId });
          }}
          emptyAction={clear}
        />
      </FadeContent>
    </div>
  );
}
