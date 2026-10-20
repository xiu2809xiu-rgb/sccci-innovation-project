import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Workflow automation (area 2), head start in Phase 6. */
export function WorkflowsPage() {
  const { t } = useTranslation('workflows');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
