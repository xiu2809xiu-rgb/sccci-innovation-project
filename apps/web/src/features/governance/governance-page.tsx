import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Governance and the audit-log viewer (area 4), head start in Phase 6. */
export function GovernancePage() {
  const { t } = useTranslation('governance');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
