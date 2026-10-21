import { useTranslation } from 'react-i18next';

import { SectionNav, type SectionNavItem } from '@/components/common/section-nav';
import { useHasPermission } from '@/app/session/use-session';

/** The four registers and, for roles that may read it, the audit log. */
export function GovernanceNav() {
  const { t } = useTranslation('governance');
  const canAudit = useHasPermission('audit:read');
  const items: SectionNavItem[] = [
    { to: '/governance', label: t('nav.access'), end: true },
    { to: '/governance/classification', label: t('nav.classification') },
    { to: '/governance/transfers', label: t('nav.transfers') },
    { to: '/governance/retention', label: t('nav.retention') },
  ];
  if (canAudit) items.push({ to: '/governance/audit', label: t('nav.audit') });
  return <SectionNav label={t('nav.label')} items={items} />;
}
