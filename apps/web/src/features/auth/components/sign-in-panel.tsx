import { useTranslation } from 'react-i18next';

import { useAuthOptions } from '@/app/session/use-auth-options';

import { DemoRolePicker } from './demo-role-picker';
import { SignInForm } from './sign-in-form';

/** Email sign-in, plus the demo role picker when the server runs in demo mode. */
export function SignInPanel({ expired, onSignedIn }: { expired: boolean; onSignedIn: () => void }) {
  const { t } = useTranslation('auth');
  const demoMode = useAuthOptions()?.demoMode === true;

  return (
    <div className="space-y-6">
      {expired ? (
        <p role="status" className="rounded-md bg-info-subtle px-3 py-2 text-sm text-info">
          {t('form.expired')}
        </p>
      ) : null}
      <SignInForm onSignedIn={onSignedIn} />
      {demoMode ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t('demo.divider')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <DemoRolePicker onSignedIn={onSignedIn} />
        </>
      ) : null}
    </div>
  );
}
