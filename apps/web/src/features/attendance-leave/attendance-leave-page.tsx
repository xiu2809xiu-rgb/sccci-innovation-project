import { useTranslation } from 'react-i18next';

import { PlannedPage } from '@/components/common/planned-page';

/** Attendance and leave consolidation (area 3), head start in Phase 6. */
export function AttendanceLeavePage() {
  const { t } = useTranslation('attendanceLeave');
  return <PlannedPage title={t('title')} description={t('description')} />;
}
