import type { OpenConflictSummary } from '@huitong/shared';
import { CircleCheckBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { RelativeTime } from '@/components/common/relative-time';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';

import { isEmployeeField } from '../overview-labels';

/** The newest conflicts, each linking to the employee record where HR resolves it. */
export function OpenConflictsPanel({
  conflicts,
  canReview,
  className,
}: {
  conflicts: OpenConflictSummary[];
  canReview: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation('overview');
  const { t: tCommon } = useTranslation();
  const { t: tEmployees } = useTranslation('employees');
  const chinese = i18n.language === 'zh-CN';

  return (
    <SectionCard
      title={t('conflicts.title')}
      description={t('conflicts.description')}
      className={className}
      action={
        canReview && conflicts.length > 0 ? (
          <Link
            to="/employees?view=conflicts"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('conflicts.viewAll')}
          </Link>
        ) : null
      }
    >
      {conflicts.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title={t('conflicts.empty')}
          className="border-none p-4"
        />
      ) : (
        <ul className="divide-y divide-border">
          {conflicts.map((conflict) => {
            const name =
              chinese && conflict.employeeNameLocal
                ? conflict.employeeNameLocal
                : conflict.employeeName;
            const field = isEmployeeField(conflict.field)
              ? tEmployees(`fields.${conflict.field}`)
              : conflict.field;
            const content = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {conflict.employeeNo} · {field}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge tone="neutral">
                    {tCommon(`entities.${conflict.entityCode}`)}
                  </StatusBadge>
                  <RelativeTime
                    value={conflict.detectedAt}
                    className="text-xs text-muted-foreground"
                  />
                </span>
              </>
            );
            return (
              <li key={conflict.id}>
                {canReview ? (
                  <Link
                    to={`/employees?employee=${encodeURIComponent(conflict.employeeNo)}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-accent"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
