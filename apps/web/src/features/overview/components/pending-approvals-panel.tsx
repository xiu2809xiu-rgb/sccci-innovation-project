import type { PendingApprovals } from '@huitong/shared';
import {
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  GitCompareArrows,
  Globe,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/empty-state';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';

type Queue = keyof PendingApprovals;

const QUEUES: { key: Queue; icon: LucideIcon; to: string }[] = [
  { key: 'conflicts', icon: GitCompareArrows, to: '/employees?view=conflicts' },
  { key: 'mappingProposals', icon: Sparkles, to: '/connectors' },
  { key: 'workflowTasks', icon: ClipboardList, to: '/workflows/tasks' },
  { key: 'crossBorderTransfers', icon: Globe, to: '/governance' },
];

/** Queues the caller's role can clear; queues outside the role are never shown (null from the API). */
export function PendingApprovalsPanel({
  approvals,
  className,
}: {
  approvals: PendingApprovals;
  className?: string;
}) {
  const { t } = useTranslation('overview');
  const format = useFormatters();
  const waiting = QUEUES.flatMap((queue) => {
    const count = approvals[queue.key];
    return count !== null && count > 0 ? [{ ...queue, count }] : [];
  });

  return (
    <SectionCard
      title={t('approvals.title')}
      description={t('approvals.description')}
      className={className}
    >
      {waiting.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title={t('approvals.empty')}
          className="border-none p-4"
        />
      ) : (
        <ul className="-mx-2 flex flex-col gap-1">
          {waiting.map(({ key, icon: Icon, to, count }) => (
            <li key={key}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate">{t(`approvals.${key}`)}</span>
                <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary-subtle-foreground tabular-nums">
                  {format.integer(count)}
                </span>
                <ChevronRight className="size-4 text-subtle-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
