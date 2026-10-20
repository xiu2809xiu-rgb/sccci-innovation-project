import type { ActivityItem } from '@huitong/shared';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { RelativeTime } from '@/components/common/relative-time';
import { SectionCard } from '@/components/common/section-card';
import { AnimatedList } from '@/components/reactbits/animated-list';

import { activityPresentation } from '../overview-labels';

/** Business events across the connected systems; new events spring into the list as they arrive. */
export function ActivityPanel({
  activity,
  className,
}: {
  activity: ActivityItem[];
  className?: string;
}) {
  const { t } = useTranslation('overview');
  const { t: tCommon } = useTranslation();

  return (
    <SectionCard
      title={t('activity.title')}
      description={t('activity.description')}
      className={className}
    >
      {activity.length === 0 ? (
        <EmptyState icon={History} title={t('activity.empty')} className="border-none p-4" />
      ) : (
        <AnimatedList
          aria-label={t('activity.title')}
          maxHeight={320}
          items={activity.map((item) => {
            const { label, icon: Icon } = activityPresentation(item.action);
            return {
              id: item.id,
              icon: <Icon aria-hidden="true" />,
              title: t(`activity.actions.${label}`),
              description:
                item.actorName && item.actorRole
                  ? t('activity.by', {
                      name: item.actorName,
                      role: tCommon(`roles.${item.actorRole}`),
                    })
                  : t('activity.system'),
              meta: <RelativeTime value={item.occurredAt} />,
            };
          })}
        />
      )}
    </SectionCard>
  );
}
