import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Connectors and the AI mapping wizard (area 1), built in Phase 5. */
export function ConnectorsPage() {
  const { t } = useTranslation('connectors');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
