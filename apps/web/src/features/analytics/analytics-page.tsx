import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Observability, clickstream and AI usage (area 4), head start in Phase 6. */
export function AnalyticsPage() {
  const { t } = useTranslation('analytics');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
