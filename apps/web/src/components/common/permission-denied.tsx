import type { Role } from '@huitong/shared';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

import { EmptyState } from './empty-state';

/** Shown instead of a page the signed-in role may not open (the API enforces it too). */
export function PermissionDenied({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldX}
      title={t('states.permissionDenied.title')}
      description={t('states.permissionDenied.description', { role: t(`roles.${role}`) })}
      action={
        <Button asChild variant="outline">
          <Link to="/overview">{t('actions.goToOverview')}</Link>
        </Button>
      }
    />
  );
}
