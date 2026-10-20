import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** The 3D integration map (area 1), built in Phase 7. */
export function IntegrationMapPage() {
  const { t } = useTranslation('integrationMap');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
