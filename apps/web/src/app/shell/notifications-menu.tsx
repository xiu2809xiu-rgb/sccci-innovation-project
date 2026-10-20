import type { RealtimeEvent } from '@huitong/shared';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { RelativeTime } from '@/components/common/relative-time';
import { LatticeLoader } from '@/components/reactbits/lattice-loader';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useOverview } from '@/features/overview/api/use-overview';
import { activityPresentation } from '@/features/overview/overview-labels';

import { useRealtimeEvents, useRealtimeState } from '../providers/dependencies-context';

const MAX_LIVE = 8;

const QUEUE_LINKS = {
  conflicts: '/employees?view=conflicts',
  mappingProposals: '/connectors',
  workflowTasks: '/workflows/tasks',
  crossBorderTransfers: '/governance',
} as const;

/** Bell with what is waiting for the role and what happened live since the page opened. */
export function NotificationsMenu() {
  const { t } = useTranslation();
  const { t: tOverview } = useTranslation('overview');
  const liveState = useRealtimeState();
  const [live, setLive] = useState<RealtimeEvent[]>([]);
  const [unseen, setUnseen] = useState(0);
  const pending = useOverview().data?.pendingApprovals;

  useRealtimeEvents((event) => {
    if (event.type.endsWith('.progress')) return;
    setLive((current) => [event, ...current].slice(0, MAX_LIVE));
    setUnseen((count) => count + 1);
  });

  const queues = (Object.keys(QUEUE_LINKS) as (keyof typeof QUEUE_LINKS)[]).flatMap((key) => {
    const count = pending?.[key] ?? null;
    return count !== null && count > 0 ? [{ key, count }] : [];
  });
  const badge = unseen + queues.reduce((sum, queue) => sum + queue.count, 0);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setUnseen(0);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            badge > 0
              ? `${t('shell.notifications.label')}: ${t('shell.notifications.unread', { count: badge })}`
              : t('shell.notifications.label')
          }
        >
          <Bell aria-hidden="true" />
          {badge > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-xs leading-4 font-semibold text-primary-foreground tabular-nums"
            >
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">
            {t('shell.notifications.title')}
          </h2>
          <LatticeLoader
            status={liveState === 'open' ? 'done' : 'working'}
            label={t('shell.live.reconnecting')}
            doneLabel={t('shell.live.connected')}
            errorLabel={t('shell.live.reconnecting')}
            pattern="pulse"
            cellSize={3}
            gap={1}
            className="text-xs text-muted-foreground"
          />
        </div>
        <Separator />
        {queues.length === 0 && live.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {t('shell.notifications.empty')}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto py-2">
            {queues.length > 0 ? (
              <section aria-label={t('shell.notifications.pendingApprovals')} className="px-2 pb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('shell.notifications.pendingApprovals')}
                </p>
                <ul>
                  {queues.map(({ key, count }) => (
                    <li key={key}>
                      <Link
                        to={QUEUE_LINKS[key]}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <span className="truncate">{tOverview(`approvals.${key}`)}</span>
                        <span className="text-xs font-semibold text-primary tabular-nums">
                          {count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {live.length > 0 ? (
              <section aria-label={t('shell.notifications.liveUpdates')} className="px-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('shell.notifications.liveUpdates')}
                </p>
                <ul aria-live="polite">
                  {live.map((event) => {
                    const { label, icon: Icon } = activityPresentation(event.type);
                    return (
                      <li key={event.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <Icon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {tOverview(`activity.actions.${label}`)}
                        </span>
                        <RelativeTime
                          value={event.occurredAt}
                          className="text-xs text-muted-foreground"
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
