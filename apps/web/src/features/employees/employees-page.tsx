import type { Conflict } from '@huitong/shared';
import { RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import type { SortState } from '@/components/common/data-table/data-table-types';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission } from '@/app/session/use-session';
import { RunSyncDialog } from '@/features/connectors/components/sync/run-sync-dialog';

import { useEmployees, useLiveEmployeeMaster } from './api/employee-queries';
import { ConflictQueue } from './components/conflict-queue';
import { EmployeeDrawer } from './components/employee-drawer';
import { EmployeeFilters } from './components/employee-filters';
import { EmployeeTable } from './components/employee-table';
import { ResolveConflictDialog } from './components/resolve-conflict-dialog';
import { useEmployeeUrlState, type EmployeesView } from './hooks/use-employee-url-state';

/** The employee master: search the consolidated records, open one beside its sources, settle conflicts. */
export function EmployeesPage() {
  const { t } = useTranslation('employees');
  const { query, view, employeeNo, tab, update } = useEmployeeUrlState();
  const employees = useEmployees(query);
  const canSync = useHasPermission('employees:sync');
  const canResolve = useHasPermission('conflicts:resolve');
  const [syncOpen, setSyncOpen] = useState(false);
  const [resolving, setResolving] = useState<Conflict | null>(null);
  useLiveEmployeeMaster();

  const openRecord = useCallback(
    (no: string, drawerTab: 'record' | 'conflicts' = 'record') => {
      update({ employee: no, tab: drawerTab === 'record' ? null : drawerTab });
    },
    [update],
  );
  const onResolve = canResolve ? setResolving : undefined;
  const sort: SortState = { columnId: query.sort, direction: query.direction };
  const filtered =
    query.q !== undefined ||
    query.entityCode !== undefined ||
    query.departmentCode !== undefined ||
    query.employmentStatus !== undefined ||
    query.conflicts !== undefined;
  const syncButton = canSync ? (
    <Button
      type="button"
      onClick={() => {
        setSyncOpen(true);
      }}
    >
      <RefreshCw aria-hidden="true" data-icon="inline-start" />
      {t('actions.runSync')}
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        meta={<SyntheticDataBadge />}
        actions={syncButton}
      />
      <FadeContent trigger="mount" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={view}
            onValueChange={(next) => {
              update({ view: (next as EmployeesView) === 'conflicts' ? 'conflicts' : null });
            }}
          >
            <TabsList aria-label={t('views.label')}>
              <TabsTrigger value="all">{t('views.all')}</TabsTrigger>
              <TabsTrigger value="conflicts">{t('views.conflicts')}</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'all' && employees.data ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('filters.count', { count: employees.data.meta.total })}
            </p>
          ) : null}
        </div>
        {view === 'all' ? (
          <>
            <EmployeeFilters query={query} onChange={update} />
            <EmployeeTable
              query={employees}
              sort={sort}
              filtered={filtered}
              emptyAction={syncButton}
              onSortChange={(next) => {
                update({
                  sort: next.columnId === 'name' ? null : next.columnId,
                  direction: next.direction === 'asc' ? null : 'desc',
                  page: null,
                });
              }}
              onPageChange={(page) => {
                update({ page: page === 1 ? null : String(page) });
              }}
              onOpen={openRecord}
            />
          </>
        ) : (
          <ConflictQueue
            onOpenRecord={(no) => {
              openRecord(no, 'conflicts');
            }}
            {...(onResolve ? { onResolve } : {})}
          />
        )}
      </FadeContent>
      <EmployeeDrawer
        employeeNo={employeeNo}
        tab={tab}
        onTabChange={(next) => {
          update({ tab: next === 'record' ? null : next });
        }}
        onClose={() => {
          update({ employee: null, tab: null });
        }}
        {...(onResolve ? { onResolve } : {})}
      />
      <ResolveConflictDialog
        conflict={resolving}
        onClose={() => {
          setResolving(null);
        }}
      />
      {canSync ? <RunSyncDialog open={syncOpen} onOpenChange={setSyncOpen} /> : null}
    </div>
  );
}
