import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { SectionNav, type SectionNavItem } from '@/components/common/section-nav';
import { useHasPermission } from '@/app/session/use-session';

/** The three dashboards; each link keeps the chosen time window. */
export function AnalyticsNav() {
  const { t } = useTranslation('analytics');
  const [params] = useSearchParams();
  const canSeeAiUsage = useHasPermission('ai-usage:read');
  const days = params.get('days');
  const search = days ? `?days=${encodeURIComponent(days)}` : '';
  const items: SectionNavItem[] = [
    { to: `/analytics${search}`, label: t('nav.observability'), end: true },
    { to: `/analytics/clickstream${search}`, label: t('nav.clickstream') },
  ];
  if (canSeeAiUsage) items.push({ to: `/analytics/ai-usage${search}`, label: t('nav.aiUsage') });
  return <SectionNav label={t('nav.label')} items={items} />;
}
