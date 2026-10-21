import { useTranslation } from 'react-i18next';

import { SectionNav } from '@/components/common/section-nav';

/** The three attendance and leave pages. */
export function AreaNav() {
  const { t } = useTranslation('attendanceLeave');
  return (
    <SectionNav
      label={t('nav.label')}
      items={[
        { to: '/attendance-leave', label: t('nav.runs'), end: true },
        { to: '/attendance-leave/mappings', label: t('nav.rules') },
        { to: '/attendance-leave/template', label: t('nav.template') },
      ]}
    />
  );
}
