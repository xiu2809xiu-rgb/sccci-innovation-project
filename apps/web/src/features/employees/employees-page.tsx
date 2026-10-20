import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Employees (area 1), built in Phase 5. */
export function EmployeesPage() {
  const { t } = useTranslation('employees');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
