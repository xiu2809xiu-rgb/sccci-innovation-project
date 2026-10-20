import { ROLES } from '@huitong/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useDemoSignIn } from '@/app/session/session-mutations';

/** Demo mode: one click signs in as the seeded user of any role (recognition over recall). */
export function DemoRolePicker({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation();
  const demoSignIn = useDemoSignIn();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="space-y-1">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {t('demo.heading')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('demo.description')}</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ROLES.map((role) => (
          <li key={role}>
            <Button
              type="button"
              variant="outline"
              className="h-full w-full flex-col items-start justify-start gap-0.5 px-3 py-2 text-left whitespace-normal"
              disabled={demoSignIn.isPending}
              onClick={() => {
                demoSignIn.mutate(role, { onSuccess: onSignedIn });
              }}
            >
              <span className="text-sm font-medium text-foreground">
                {tCommon(`roles.${role}`)}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {t(`demo.roleHint.${role}`)}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      {demoSignIn.error ? (
        <p role="alert" className="text-sm text-danger">
          {tCommon(`errors.${demoSignIn.error.code}`)}
        </p>
      ) : null}
    </section>
  );
}
