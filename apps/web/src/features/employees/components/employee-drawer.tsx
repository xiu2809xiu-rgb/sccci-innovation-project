import type { Conflict, EmployeeDetail } from '@huitong/shared';
import { ScrollText } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ErrorState } from '@/components/common/error-state';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission } from '@/app/session/use-session';

import { useEmployee } from '../api/employee-queries';
import { useEmployeeLabels } from '../hooks/use-employee-labels';
import type { DrawerTab } from '../hooks/use-employee-url-state';
import { ConflictCard } from './conflict-card';
import { EmployeeHistory } from './employee-history';
import { RecordFields } from './record-fields';

export interface EmployeeDrawerProps {
  employeeNo: string | null;
  tab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  onClose: () => void;
  /** Present only for roles that may settle conflicts. */
  onResolve?: (conflict: Conflict) => void;
}

function DrawerSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-8 w-64" />
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

function DrawerBody({
  detail,
  tab,
  onTabChange,
  onResolve,
}: { detail: EmployeeDetail } & Omit<EmployeeDrawerProps, 'employeeNo' | 'onClose'>) {
  const { t } = useTranslation('employees');
  const open = detail.conflicts.filter((conflict) => conflict.status === 'OPEN');
  const resolveById = onResolve
    ? (conflictId: string) => {
        const conflict = detail.conflicts.find((candidate) => candidate.id === conflictId);
        if (conflict) onResolve(conflict);
      }
    : undefined;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        onTabChange(value as DrawerTab);
      }}
    >
      <TabsList>
        <TabsTrigger value="record">{t('drawer.tabs.record')}</TabsTrigger>
        <TabsTrigger value="conflicts">
          {t('drawer.tabs.conflicts')}
          {open.length > 0 ? (
            <span className="rounded-full bg-warning-subtle px-1.5 text-xs text-warning tabular-nums">
              {open.length}
            </span>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="history">{t('drawer.tabs.history')}</TabsTrigger>
      </TabsList>
      <TabsContent value="record" className="pt-2">
        <RecordFields detail={detail} {...(resolveById ? { onResolve: resolveById } : {})} />
      </TabsContent>
      <TabsContent value="conflicts" className="space-y-3 pt-2">
        {detail.conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('conflicts.none')}</p>
        ) : (
          detail.conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              {...(onResolve ? { onResolve } : {})}
            />
          ))
        )}
      </TabsContent>
      <TabsContent value="history" className="pt-2">
        <EmployeeHistory changes={detail.history} />
      </TabsContent>
    </Tabs>
  );
}

/** The record drawer: the master beside every source, its conflicts and its history. */
export function EmployeeDrawer({
  employeeNo,
  tab,
  onTabChange,
  onClose,
  onResolve,
}: EmployeeDrawerProps) {
  const { t } = useTranslation('employees');
  const labels = useEmployeeLabels();
  const query = useEmployee(employeeNo);
  const canAudit = useHasPermission('audit:read');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const detail = query.data;

  return (
    <Sheet
      open={employeeNo !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-3xl data-[side=right]:lg:max-w-4xl"
        onOpenAutoFocus={(event) => {
          // Start at the title, as the WAI-ARIA dialog pattern advises for long
          // content; the first control is the synthetic data badge, whose
          // tooltip would otherwise open over the header.
          event.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <SheetHeader className="space-y-1 border-b border-border p-4 pr-12">
          <SheetTitle ref={titleRef} tabIndex={-1} className="text-lg outline-none">
            {detail?.fullNameLatin ?? t('drawer.title')}
            {detail?.fullNameLocal ? (
              <span className="ml-2 font-normal text-muted-foreground" lang="zh-CN">
                {detail.fullNameLocal}
              </span>
            ) : null}
          </SheetTitle>
          <SheetDescription>
            {detail
              ? t('drawer.description', {
                  employeeNo: detail.employeeNo,
                  entity: labels.entity(detail.entityCode),
                  version: detail.version,
                })
              : (employeeNo ?? '')}
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SyntheticDataBadge />
            {canAudit && detail ? (
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link
                  to={`/governance/audit?entityType=Employee&entityId=${encodeURIComponent(detail.employeeNo)}`}
                >
                  <ScrollText aria-hidden="true" data-icon="inline-start" />
                  {t('drawer.auditTrail')}
                </Link>
              </Button>
            ) : null}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {query.status === 'pending' ? <DrawerSkeleton /> : null}
          {query.status === 'error' ? (
            <ErrorState
              error={query.error}
              onRetry={() => {
                void query.refetch();
              }}
            />
          ) : null}
          {detail ? (
            <DrawerBody
              detail={detail}
              tab={tab}
              onTabChange={onTabChange}
              {...(onResolve ? { onResolve } : {})}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
