import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Management reports (area 3), head start in Phase 6. */
export function ReportsPage() {
  const { t } = useTranslation('reports');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
